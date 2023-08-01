const express = require('express')
const morgan = require('morgan')
const app = express()
const cors = require('cors')
var jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))

// =============== Mongo DB ==================
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ufrxsge.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
})

// verify JWT
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res
            .status(401)
            .send({ error: true, message: 'Unauthorized Access' })
    }
    const token = authorization.split(' ')[1]
    // console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res
                .status(401)
                .send({ error: true, message: 'Unauthorized Access' })
        }
        req.decoded = decoded;
        next()
    })
}
async function run() {
    try {
        const usersCollection = client.db('aircncDb').collection('users')
        const roomsCollection = client.db('aircncDb').collection('rooms')
        const bookingsCollection = client.db('aircncDb').collection('bookings')

        // Generate jwt
        app.post('/jwt', async (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
            // console.log(token);
            res.send({ token });
        })

        // save user email and role in DB
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            // console.log(result)
            res.send(result)
        })

        // get single user role
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        // save room in MongoDB
        app.post('/rooms', async (req, res) => {
            const room = req.body;
            // console.log(room);
            const result = await roomsCollection.insertOne(room);
            res.send(result);
        })

        // get All Rooms
        app.get('/rooms', async (req, res) => {
            const result = await roomsCollection.find().toArray();
            res.send(result);
        })

        // get single room
        app.get('/room/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await roomsCollection.findOne(query);
            res.send(result);
        })

        // get rooms for host
        app.get('/rooms/:email', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            console.log(decodedEmail)
            const email = req.params.email;
            if (email !== decodedEmail) {
                return res
                    .status(403)
                    .send({ error: true, message: 'Forbidden Access' })
            }
            const query = { 'host.email': email };
            const result = await roomsCollection.find(query).toArray();
            res.send(result);
        })

        // delete a room for host
        app.delete('/rooms/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await roomsCollection.deleteOne(query);
            res.send(result);
        })

        // update bookings room status
        app.patch('/room/status/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    booked: status,
                },
            }
            const update = await roomsCollection.updateOne(query, updateDoc);
            res.send(update)
        })

        // save bookings in MongoDB
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        // get bookings for specific user by email
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }
            const query = { 'guest.email': email }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        // get bookings host by email
        app.get('/bookings/host', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }
            const query = { host: email }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        // delete a booking
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        })




        // Send a ping to confirm a successful connection
        await client.db('admin').command({ ping: 1 })
        console.log(
            'Pinged your deployment. You successfully connected to MongoDB!'
        )
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir)

// =============== Mongo DB ==================

app.get('/', (req, res) => {
    res.send('AirCNC Server is running..')
})

app.listen(port, () => {
    console.log(`AirCNC is running on port ${port}`)
})