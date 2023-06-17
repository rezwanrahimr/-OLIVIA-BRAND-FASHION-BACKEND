const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//midelware
app.use(cors());
app.use(express.json());

// MongoDB Connected.

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m4rxkkc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbiddeen Access" });
    }
    res.decoded = decoded;
    next();
    console.log(decoded);
  });
}

async function run() {
  try {
    client.connect();
    const productCollections = client
      .db("productCollection")
      .collection("product");
    const userCollections = client.db("productCollection").collection("users");
    const paymentCollections = client
      .db("productCollection")
      .collection("paymentCollections");

    // Stripe Payment
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // User Collection.
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
      res.send({ result, token });
    });

    // Upate User Data.
    app.put("/userDataUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const ProfileData = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          Name: ProfileData.Name,
          Number: ProfileData.Number,
          Address: ProfileData.Address,
          Image: ProfileData.Image,
        },
      };

      const result = await userCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Get User by Email.
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const data = userCollections.find({ email: email });
      const result = await data.toArray();
      res.send(result);
    });
    // Check Admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollections.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });
    // Admin role.
    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Get all users.
    app.get("/user", async (req, res) => {
      const quary = {};
      const data = userCollections.find(quary);
      const result = await data.toArray();
      res.send(result);
    });

    // Delete User form Database.
    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: ObjectId(id) };
      const data = await userCollections.deleteOne(quary);
      res.send(data);
    });

    // Get all Products.
    app.get("/products", async (req, res) => {
      const quary = {};
      const cursor = productCollections.find(quary);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get Search Products
    app.get("/search-products", async (req, res) => {
      const text = req.query.q;
      const quary = {};
      const result = await productCollections.find(quary).toArray();
      const searchProducts = await result.filter((product) =>
        product.category.includes(text)
      );
      res.send(searchProducts);
    });
    // Delete Products.
    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: ObjectId(id) };
      const result = await productCollections.deleteOne(quary);
      res.send(result);
    });

    // Get Product with Page and Size.
    app.get("/productss", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log(page, size);
      const quary = {};
      const data = productCollections.find(quary);
      let result;
      if (page || size) {
        result = await data
          .skip(page * size)
          .limit(size)
          .toArray();
      } else result = await data.toArray();
      res.send(result);
    });

    // Post a New Product.
    app.post("/products", async (req, res) => {
      const data = req.body;
      const result = await productCollections.insertOne(data);
      res.send(result);
    });

    // Cart Product.
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: ObjectId(id) };
      const data = productCollections.find(quary);
      const result = await data.toArray();
      res.send(result);
    });

    // Update Product
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      console.log(data);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          productName: data.productName,
          ProductImage: data.ProductImage,
          ProductDescription: data.ProductDescription,
          ProductPrice: data.ProductPrice,
          ProductStock: data.ProductStock,
          BrandName: data.BrandName,
          DiscountPrice: data.DiscountPrice,
          Discount: data.Discount,
          category: data.category,
        },
      };
      const result = await productCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Products Count
    app.get("/productsCount", async (req, res) => {
      const result = await productCollections.countDocuments();
      res.send({ result });
    });

    // ....................
    app.post("/paymentProduct", async (req, res) => {
      const product = req.body;
      const result = await paymentCollections.insertOne(product);
      res.send(result);
    });

    // Get Order for specific user
    app.get("/get-order-details", async (req, res) => {
      const email = req.query.email;
      const quary = { userEmail: email };
      const result = await paymentCollections.find(quary).toArray();
      res.send(result);
    });

    // Get All Orders
    app.get("/get-all-orders", async (req, res) => {
      const quary = {};
      const result = await paymentCollections.find(quary).toArray();
      res.send(result);
    });

    app.delete("/delete-order/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await paymentCollections.deleteOne(quary);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Olivia Fashion Server is Running...");
});

app.listen(port, () => {
  console.log(`server is running ${port}`);
});
