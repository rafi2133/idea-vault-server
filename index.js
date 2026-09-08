const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv')
const cors = require('cors')
dotenv.config()
const express = require('express');
const app = express()
const port = process.env.PORT

const uri = process.env.MONGO_URI;

app.use(cors())
app.use(express.json())
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db('ideavault')
        const ideaCollection = db.collection("ideas")



        app.get(('/idea'), async (req, res) => {
            const result = await ideaCollection.find().toArray()
            res.json(result)
        })

        app.post('/idea', async (req, res) => {
            const ideaData = req.body
            const result = await ideaCollection.insertOne(ideaData)
            res.json(result)
        })



        app.get(('/idea/:id'), async (req, res) => {
            const { id } = req.params
            const result = await ideaCollection.findOne({ _id: new ObjectId(id) })

            res.json(result)
        })

        app.get('/idea/user/:userId', async (req, res) => {
            const { userId } = req.params
            const result = await ideaCollection.find({ userId }).toArray()
            res.json(result)
        })

        app.put('/idea/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { userId, ...updateData } = req.body;

                // 1. Check if the idea exists
                const existingIdea = await ideaCollection.findOne({ _id: new ObjectId(id) });
                if (!existingIdea) {
                    return res.status(404).json({ error: 'Idea not found' });
                }

                // 2. Check if the user owns this idea
                if (existingIdea.userId !== userId) {
                    return res.status(403).json({ error: 'Unauthorized: You can only edit your own ideas' });
                }

                // 3. Remove _id from update data and add updated timestamp
                delete updateData._id;
                updateData.updatedAt = new Date().toISOString();

                // 4. Update the idea
                const result = await ideaCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                );

                // 5. Get the updated idea
                const updatedIdea = await ideaCollection.findOne({ _id: new ObjectId(id) });

                res.json({
                    success: true,
                    message: 'Idea updated successfully',
                    data: updatedIdea
                });
            } catch (error) {
                console.error('Error updating idea:', error);
                res.status(500).json({ error: 'Failed to update idea' });
            }
        });



        app.delete('/idea/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { userId } = req.body;

                // 1. Check if the idea exists
                const existingIdea = await ideaCollection.findOne({ _id: new ObjectId(id) });
                if (!existingIdea) {
                    return res.status(404).json({ error: 'Idea not found' });
                }

                // 2. Check if the user owns this idea
                if (existingIdea.userId !== userId) {
                    return res.status(403).json({ error: 'Unauthorized: You can only delete your own ideas' });
                }

                // 3. Delete the idea
                await ideaCollection.deleteOne({ _id: new ObjectId(id) });

                res.json({
                    success: true,
                    message: 'Idea deleted successfully'
                });
            } catch (error) {
                console.error('Error deleting idea:', error);
                res.status(500).json({ error: 'Failed to delete idea' });
            }
        });



        // server/index.js

        //  POST - Like/Unlike an idea
        app.post('/idea/:id/like', async (req, res) => {
            try {
                const { id } = req.params;
                const { userId } = req.body;

                const idea = await ideaCollection.findOne({ _id: new ObjectId(id) });
                if (!idea) {
                    return res.status(404).json({ error: 'Idea not found' });
                }

                // Initialize likes array if it doesn't exist
                if (!idea.likes) {
                    idea.likes = [];
                }

                // Check if user already liked
                const hasLiked = idea.likes.includes(userId);

                if (hasLiked) {
                    // Unlike - remove userId from likes array
                    await ideaCollection.updateOne(
                        { _id: new ObjectId(id) },
                        { $pull: { likes: userId } }
                    );
                    res.json({ success: true, message: 'Unliked successfully', liked: false });
                } else {
                    // Like - add userId to likes array
                    await ideaCollection.updateOne(
                        { _id: new ObjectId(id) },
                        { $push: { likes: userId } }
                    );
                    res.json({ success: true, message: 'Liked successfully', liked: true });
                }
            } catch (error) {
                console.error('Error toggling like:', error);
                res.status(500).json({ error: 'Failed to toggle like' });
            }
        });

        //  POST - Add comment
        app.post('/idea/:id/comment', async (req, res) => {
            try {
                const { id } = req.params;
                const { userId, userName, userImage, comment } = req.body;

                if (!comment || comment.trim() === '') {
                    return res.status(400).json({ error: 'Comment cannot be empty' });
                }

                const idea = await ideaCollection.findOne({ _id: new ObjectId(id) });
                if (!idea) {
                    return res.status(404).json({ error: 'Idea not found' });
                }

                // Initialize comments array if it doesn't exist
                if (!idea.comments) {
                    idea.comments = [];
                }

                const newComment = {
                    id: Date.now().toString(),
                    userId: userId,
                    userName: userName || 'Anonymous',
                    userImage: userImage || '',
                    comment: comment.trim(),
                    createdAt: new Date().toISOString()
                };

                await ideaCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $push: { comments: newComment } }
                );

                res.json({
                    success: true,
                    message: 'Comment added successfully',
                    comment: newComment
                });
            } catch (error) {
                console.error('Error adding comment:', error);
                res.status(500).json({ error: 'Failed to add comment' });
            }
        });

        //  GET - Get user's interactions (liked ideas + commented ideas)
        app.get('/idea/interactions/:userId', async (req, res) => {
            try {
                const { userId } = req.params;

                // Find ideas where user has liked or commented
                const allIdeas = await ideaCollection.find({
                    $or: [
                        { likes: { $in: [userId] } },
                        { 'comments.userId': userId }
                    ]
                }).toArray();

                // Format interactions
                const interactions = allIdeas.map(idea => {
                    const userComments = idea.comments?.filter(c => c.userId === userId) || [];
                    const hasLiked = idea.likes?.includes(userId) || false;
                    const likeCount = idea.likes?.length || 0;
                    const commentCount = idea.comments?.length || 0;

                    return {
                        ideaId: idea._id,
                        title: idea.title,
                        category: idea.category,
                        shortDescription: idea.shortDescription,
                        imageUrl: idea.imageUrl,
                        status: idea.status,
                        createdAt: idea.createdAt,
                        hasLiked: hasLiked,
                        likeCount: likeCount,
                        commentCount: commentCount,
                        userComments: userComments
                    };
                });

                res.json(interactions);
            } catch (error) {
                console.error('Error fetching interactions:', error);
                res.status(500).json({ error: 'Failed to fetch interactions' });
            }
        });



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})