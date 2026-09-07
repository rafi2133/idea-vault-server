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