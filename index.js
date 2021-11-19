const express = require('express');
const cors = require('cors')//cors for own server connected with own
const app = express();
const admin = require("firebase-admin");
require("dotenv").config();//dotenv config
const port = process.env.PORT || 5000;
const ObjectId = require('mongodb').ObjectId;

const stripe = require("stripe")(process.env.STRIPE_SECRET);


//Middleware
app.use(cors());
app.use(express.json());

//////////////////////////// Mongodb Server Uri and Client ////////////////////////////
const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i6saz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


////////////////// Token Verify Function /////////////
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers?.authorization.split(' ')[1];
    console.log(token);
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch {
      
    }
  }
  next();
}

/////////////////// Main Function Start ///////////////////////////////
async function run() {
    try {
      await client.connect();
      const database = client.db("az-security");
      const productsCollection = database.collection("products");
      const usersCollection = database.collection("users");
      const reviewsCollection = database.collection("reviews");
      const ordersCollection = database.collection("orders");

 ////////////////////// Get Products From DataBase ////////////////////
      app.get("/products", async (req, res) => {
        const cursor = productsCollection.find({});
        const products = await cursor.toArray();
        res.send(products);
      });
//////////////////////////////////////////////////////////////////////////

/////////////   Status  update API //////////////////////////////////////
      app.put("/orders/:id", async (req, res) => {
        const id = req.params.id;
        const updateOrdersStatus = req.body;
        const query = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            name: updateOrdersStatus.name,
            status: updateOrdersStatus.status,
            email: updateOrdersStatus.email,
          },
        };
        const result = await ordersCollection.updateOne(
          query,
          updateDoc,
          options
        );
        res.json(result);
        console.log("Update Orders hitted");
      });
/////////////////////////////////////////////////////////////////// 
      
///////////////////// All Orders collection for admin /////////////////////
      app.get("/orders", async (req, res) => {
       const cursor = ordersCollection.find({});
        const orders = await cursor.toArray();
        res.json(orders);
        console.log("object server connected to all orders");
      });
////////////////////////////////////////////////////////////////////// 

      
      
 /////////////// Payment update system start //////////////////////
    app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await ordersCollection.updateOne(filter, updateDoc);
            res.json(result);
    })
//////////// Payment system update end //////////////////////////////

      
      

////////////////////// GET Single Product by Id  /////////////////////////
      app.get("/products/:productId", async (req, res) => {
        const id = req.params.productId;
        console.log("getting specific packages", id);
        const query = { _id: ObjectId(id) };
        const product = await productsCollection.findOne(query);
        res.send(product);
      });
//////////////////////////////////////////////////////////////////////   
      

 //////////////// Get Reviews From DataBase ////////////////////////
      app.get("/reviews", async (req, res) => {
        const cursor = reviewsCollection.find({});
        const reviews = await cursor.toArray();
        res.send(reviews);
      });
//////////////////////////////////////////////////////////////////////////

      
////////////////// GET Single product  /////////////////////////////////
      
      app.get("/orders/:orderId", async (req, res) => {
        const id = req.params.orderId;
        console.log("getting specific product for update", id);
        const query = { _id: ObjectId(id) };
        const orders = await ordersCollection.findOne(query);
        res.json(orders);
      });
//////////////////////////////////////////////////////////////////
      
      
//////////// Get All Data From Database to Ui after verify token  //////////
      app.get('/products',verifyToken, async (req, res) => {
        const email = req.query.email;
        const date =new Date(req.query.date).toLocaleDateString();
        const query = {email: email,date:date}
        const cursor = productsCollection.find(query);
        const products = await cursor.toArray()
        res.json(products);
      })
/////////////////////////////////////////////////////////////////////////////
      

 
      


      
//////////////  Orders collection with email for user ///////////////////
      app.get("/orders/:email", async (req, res) => {
        // console.log(req.params.email);
        const email = req.query.email;
        const query = {email: email}
        const result = await ordersCollection.find(query).toArray()
        res.send(result);
        console.log("connected to for single user");
      });
//////////////////////////////////////////////////////////////////////
      

  

/////////////// Post Products Data To database Api ////////////////
      app.post('/products', async (req, res) => {
        const productsData = req.body
        const result = await productsCollection.insertOne(productsData)
             res.json(result)
             console.log("data connected from add products")
      })     
////////////////////////////////////////////////////////////////////
      

//////////////// Post Reviews Data To database Api ////////////////
      
      app.post('/reviews', async (req, res) => {
        const reviewsData = req.body
        const result = await reviewsCollection.insertOne(reviewsData)
             res.json(result)
            //  console.log(result)
      })     
////////////////////////////////////////////////////////////////////
      

/////////////////////// Post Order Data To database Api ////////////////
      
      app.post('/orders', async (req, res) => {
        const orders = req.body
        const result = await ordersCollection.insertOne(orders)
             res.json(result)
            //  console.log(result)
      })     
////////////////////////////////////////////////////////////////////

      

     
      


//////////////////// Cancel Orders request from ui  //////////////////
      app.delete("/orders/:id", async (req, res) => {
        const id = req.params.id;
        console.log(req.params.id);
        const query = {_id: ObjectId(id) };
        const result = await ordersCollection.deleteOne(query);
        res.json(result);
        console.log("deleted hitting to the server");
      });
/////////////////////////////////////////////////////////////////

/////////////////// Check Admin  //////////////////////////////////    
  app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = {email: email}
    const user = await usersCollection.findOne(query);
  // console.log(user);
    if (user?.role === "admin") {
      
      res.json({admin:true});
    }
    else {
      res.json({admin:false});
    }
        
      })     
////////////////////////////////////////////////////////////////////
      

//////////////////// Save User To database api /////////////////////
      app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user)
        res.json(result)
    })
///////////////////////////////////////////////////////////// ////////
      
      
////////////////////// Save Google User To database api ////////////////////////
      app.put('/users', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email }
        const options = { upsert: true };
        const updateDoc = { $set: user }
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result)     
      });
//////////////////////////////////////////////////////////////////////////////////////

      
//////////////////////////  Service Account /////////////////////////////
    
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
////////////////////////////////////////////////////////////////////////////      

////////////////////// Save Admin Role To database api ////////////////////////
      app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        // console.log(req.decodedEmail);
        const requester = req.decodedEmail
        if (requester ) {
          const requesterEmail = await usersCollection.findOne({ email: requester });
          if (requesterEmail.role === 'admin') {
            const filter = { email: user.email }
        const updateDoc = { $set: {role:'admin'} }
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result)  
          }
        }
        else {
          res.status(403).json({message:' You do not have permission to  make an admin'})
        }
           
      });
//////////////////////////////////////////////////////////////////////////////////////////
      

////////////////////  Payment system start //////////////////////////////////////      
    app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.productPrice * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: ['card']
            });
            res.json({ clientSecret: paymentIntent.client_secret })
    })
////////////////////  Payment system end //////////////////////////////////////      

      

    }
     finally {
    //   await client.close();
    }
  }
  run().catch(console.dir);


//////////////////////////////////////////////////////////////////////////
app.get('/',(req,res) =>{
    res.send('Az Security System Server is working ')
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
//////////////////////////////// End //////////////////////////////////