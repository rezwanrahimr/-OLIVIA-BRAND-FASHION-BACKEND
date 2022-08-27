const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();


//midelware
app.use(cors());
app.use(express.json());


// MongoDB Connected.

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m4rxkkc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const ProductCollectin = client.db('productCollection').collection('product');

        app.get('/products', async (req, res) => {
            const quary = {};
            const cursor = ProductCollectin.find(quary);
            const result = await cursor.toArray();
            res.send(result);
        })

    }
    finally {

    }
}

run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('hello world')
})

app.listen(port, () => {
    console.log(`server is running ${port}`)
})
