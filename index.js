const express = require("express");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.znptc55.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Create Collections
    const userCollection = client.db("BengalBreezeDB").collection("users");
    const propertiesCollection = client.db("BengalBreezeDB").collection("properties");

    // Send All user Data Data To DB
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      console.log("user info", userInfo);
      const query = { email: userInfo.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist to db" });
      }
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });
    // Send All Property Data Data To DB
    app.post("/add/properties", async (req, res) => {
      const propertyInfo = req.body;
      console.log("property info", propertyInfo);
      const result = await propertiesCollection.insertOne(propertyInfo);
      res.send(result);
    });

    // Verify Token
    const verifyToken = (req, res, next) => {
      console.log("inside verify", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Forbidden Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Verify Admin

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role == "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };
    // Verify Agent

    const verifyAgent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAgent = user?.role == "agent";
      if (!isAgent) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // JWT Related APIs
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });

    // ----------------------

    // Get All Users From DB

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
      console.log(req.headers);
    });

    // ----------------------
    // Get All Properties From DB

    app.get("/agent-properties", verifyToken, async (req, res) => {
      const result = await propertiesCollection.find().toArray();
      res.send(result);
    });

    // ----------------------
    // Get User/admin to check

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email; //get from front
      if (email != req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role == "admin";
      }
      res.send({ admin });
    });

    // ----------------------
    // Get User/agent to check

    app.get("/users/agent/:email", verifyToken, async (req, res) => {
      const email = req.params.email; //get from front
      if (email != req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let agent = false;
      if (user) {
        agent = user?.role == "agent";
      }
      res.send({ agent });
    });

    // ----------------------

    // Delete A User

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id; //get from front
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    // ----------------------

    // Update User Role - Make Admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      // const updatedUserInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const finalUpdateInfo = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(
        query,
        finalUpdateInfo,
        options
      );
      res.send(result);
    });
    // ----------------------
    // Verify Property
    app.patch("/verify/property/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const finalUpdateInfo = {
        $set: {
          verificationStatus: "verified",
        },
      };
      const result = await propertiesCollection.updateOne(
        query,
        finalUpdateInfo,
        options
      );
      res.send(result);
    });
    // ----------------------
    // Reject Property
    app.patch("/reject/property/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const finalUpdateInfo = {
        $set: {
          verificationStatus: "rejected",
        },
      };
      const result = await propertiesCollection.updateOne(
        query,
        finalUpdateInfo,
        options
      );
      res.send(result);
    });
    // ----------------------

    // Update User Role - Make Agent
    app.patch("/users/agent/:id", async (req, res) => {
      const id = req.params.id;
      // const updatedUserInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const finalUpdateInfo = {
        $set: {
          role: "agent",
        },
      };
      const result = await userCollection.updateOne(
        query,
        finalUpdateInfo,
        options
      );
      res.send(result);
    });

    // ----------------------

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BengalBreeze server is running");
});

app.listen(port, () => {
  console.log(`BengalBreeze Server is running on port: ${port}`);
});
