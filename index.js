const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkkaefj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } });

async function run() {
    try {

        // await client.connect();

        const userCollection = client.db('topUp').collection('users');
        const topUpCollection = client.db('topUp').collection('topUpReq');
        // const notificationCollection = client.db('topUp').collection('adminNotification');

        app.get('/user', async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result)
        });

        app.get('/transaction-history', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await topUpCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/notification', async (req, res) => {
            const query = { status: 'Processing' };
            const result = await topUpCollection.find(query).toArray();
            res.send(result)
        });

        app.get('/admin-transaction-history', async (req, res) => {
            const query = { status: 'Success' };
            const result = await topUpCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/user', async (req, res) => {
            const data = req.body;
            const query = { email: data.email };
            const isExist = await userCollection.findOne(query);
            if (isExist) {
                return res.send('user exist')
            };

            const result = await userCollection.insertOne(data);
            res.send(result);

        });

        app.post('/topupreq', async (req, res) => {
            const data = req.body;
            const result = await topUpCollection.insertOne(data);
            res.send(result);
        });

        app.patch('/refill/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const query = { email: req.query.email };
            const userData = await userCollection.findOne(query);
            const existingBalance = userData?.balance;
            const reqedAmount = req.body.amount;
            const newBalance = existingBalance + reqedAmount;
            const options = { upsert: true }
            const updatedDoc = {
                $set: { balance: newBalance }
            };
            const updateBalance = await userCollection.updateOne(query, updatedDoc, options);
            const statusUpdated = {
                $set: { status: 'Success' }
            };
            const updateStatus = await topUpCollection.updateOne(filter, statusUpdated, options);
            res.send(updateStatus);

        });

        app.patch('/top-up-success/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const statusUpdated = {
                $set: { status: 'Success' }
            };
            const result = await topUpCollection.updateOne(filter, statusUpdated);
            res.send(result);
        })

        app.patch('/topup', async (req, res) => {
            const filter = { email: req.query.email };
            const updatedDoc = {
                $set: { balance: req.body.balance }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.patch('/reqCancelled/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const statusUpdated = {
                $set: { status: 'Cancelled' }
            };
            const result = await topUpCollection.updateOne(filter, statusUpdated);
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => res.send('Odommo TopUp Server Is Running'));
app.listen(port, () => console.log('Odommo TopUp Server Is Running on PORT', port));