const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');


//midelware
app.use(cors());
app.use(express.json());


// MongoDB Connected.

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m4rxkkc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbiddeen Access' })
        }
        res.decoded = decoded;
        next();
        console.log(decoded);
    })
}

async function run() {
    try {
        await client.connect();
        const ProductCollectin = client.db('productCollection').collection('product');
        const UserCollectin = client.db('productCollection').collection('users');

        // User Collection.
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await UserCollectin.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        })


        // Upate User Data.
        app.put('/userDataUpdate/:email',async(req,res)=>{
            const email =  req.params.email;
            const ProfileData = req.body;
            const filter = {email: email};
            const options = {upsert: true};
            const updateDoc = {
                $set: ProfileData
            };
            const result =  await UserCollectin.updateOne(filter,updateDoc,options);
            res.send(result);
        })

        // Check Admin
        app.get('/admin/:email',async(req,res)=>{
            const email =  req.params.email;
            const user = await UserCollectin.findOne({email: email});
            const isAdmin =  user.role  === 'admin';
            res.send({admin: isAdmin});
        })
        // Admin role.
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await UserCollectin.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {

                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await UserCollectin.updateOne(filter, updateDoc);
                res.send(result);

            }
            else{
                res.status(403).send({message: 'forbidden'});
            }


        })

        // Get all users.
        app.get('/user', verifyJWT, async (req, res) => {
            const quary = {};
            const data = UserCollectin.find(quary);
            const result = await data.toArray();
            res.send(result);
        })

        // Get all Products.
        app.get('/products', async (req, res) => {
            const quary = {};
            const cursor = ProductCollectin.find(quary);
            const result = await cursor.toArray();
            res.send(result);
        })

        // Get Product with Page and Size.
        app.get('/productss', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            console.log(page, size)
            const quary = {};
            const data = ProductCollectin.find(quary);
            let result;
            if (page || size) {
                result = await data.skip(page * size).limit(size).toArray();
            }
            else (
                result = await data.toArray()
            )
            res.send(result)
        })

        // Post a New Product.
        app.post('/products', async (req, res) => {
            const data = req.body;
            const result = await ProductCollectin.insertOne(data);
            res.send(result);
        })

        // Cart Product.
        app.get('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const authorization = req.headers.authorization;
            console.log(authorization);
            const quary = { _id: ObjectId(id) }
            const data = ProductCollectin.find(quary);
            const result = await data.toArray()
            res.send(result);
        })

        // Products Count
        app.get('/productsCount', async (req, res) => {
            const result = await ProductCollectin.countDocuments();
            res.send({ result });
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
