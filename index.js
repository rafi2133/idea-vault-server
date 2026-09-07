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