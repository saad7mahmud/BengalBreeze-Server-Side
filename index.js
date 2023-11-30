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
    const reviewCollection = client.db("BengalBreezeDB").collection("reviews");
    const wishlistCollection = client
      .db("BengalBreezeDB")
      .collection("wishlist");
    const propertiesCollection = client
      .db("BengalBreezeDB")
      .collection("properties");

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
    // Send All REVIEW Data To DB
    app.post("/reviews", async (req, res) => {
      const reviewInfo = req.body;
      console.log("review info", reviewInfo);
      const result = await reviewCollection.insertOne(reviewInfo);
      res.send(result);
    });

    // Send All Property Data Data To DB
    app.post("/add/properties", async (req, res) => {
      const propertyInfo = req.body;
      console.log("property info", propertyInfo);
      const result = await propertiesCollection.insertOne(propertyInfo);
      res.send(result);
    });
    // Send A property Data to wishlist collection
    app.post("/property/wishlists", async (req, res) => {
      const propertyInfo = req.body;
      console.log("property info57", propertyInfo);
      const result = await wishlistCollection.insertOne(propertyInfo);
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
    // Get All Properties From DB for agent

    app.get("/agent-properties", verifyToken, verifyAgent, async (req, res) => {
      const agentMailInfo = req.query.loggedAgentEmail;
      console.log("mail check", agentMailInfo);
      query = { agentEmail: agentMailInfo };
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    });

    // ----------------------
    // Get All wishlist for a user
    app.get("/user-wishlists", verifyToken, async (req, res) => {
      const userMailInfo = req.query.loggedUserEmail;
      console.log("mail check", userMailInfo);
      query = { buyerEmail: userMailInfo };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    // ----------------------
    // Get All REVIEW for a user
    app.get("/review/user", verifyToken, async (req, res) => {
      const userMailInfo = req.query.loggedUserEmail;
      console.log("mail check", userMailInfo);
      query = { reviewerEmail: userMailInfo };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // ----------------------
    // Get All REVIEW
    app.get("/all-reviews", verifyToken, verifyAdmin, async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    // Get All REVIEW for public
    app.get("/all-reviews/public", async (req, res) => {
      const result = await reviewCollection
        .find()
        .sort({ nowInMilliseconds: -1 })
        .toArray();
      res.send(result);
    });

    // ----------------------
    // Get All Properties From DB for admin

    app.get("/all-properties", verifyToken, verifyAdmin, async (req, res) => {
      const result = await propertiesCollection.find().toArray();
      res.send(result);
    });

    // ----------------------
    // Get All Properties if admin verified
    app.get("/all-properties/verified", verifyToken, async (req, res) => {
      const query = { verificationStatus: "verified" };
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    });
    // Get All Properties if advertised
    app.get("/all-properties/advertised", async (req, res) => {
      const query = {
        $and: [{ isAdvertised: "yes" }, { verificationStatus: "verified" }],
      };
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    });
    // Get A Property
    app.get("/one-property/:id", async (req, res) => {
      const id = req.params.id;
      console.log("one", id);
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });
    // Get relevant reviews
    app.get("/specific-reviews/:id", async (req, res) => {
      const id = req.params.id;
      console.log("reviews", id);
      const query = { propertyId: id };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // ----------------------
    // Get All Properties for admin advertise

    app.get("/properties/ad", verifyToken, verifyAdmin, async (req, res) => {
      const query = { verificationStatus: "verified" };

      const result = await propertiesCollection.find(query).toArray();
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

    app.delete("/users/:id",verifyAdmin, async (req, res) => {
      const id = req.params.id; //get from front
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    // ----------------------

    // Update User Role - Make Admin
    app.patch("/users/admin/:id",verifyAdmin, async (req, res) => {
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
    app.patch("/verify/property/:id",verifyAdmin, async (req, res) => {
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
    app.patch("/reject/property/:id",verifyAdmin, async (req, res) => {
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

    // Advertise YES
    app.patch("/add-advertise/property/:id",verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const finalUpdateInfo = {
        $set: {
          isAdvertised: "yes",
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
    // Advertise NO - remove
    app.patch("/remove-advertise/property/:id",verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const finalUpdateInfo = {
        $set: {
          isAdvertised: "no",
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

    // Delete A property

    app.delete("/property/:id", async (req, res) => {
      const id = req.params.id; //get from front
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    // ----------------------
    // Delete A Wishlist

    app.delete("/wishlists/:id", async (req, res) => {
      const id = req.params.id; //get from front
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    // ----------------------
    // Delete A review for user

    app.delete("/reviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id; //get from front
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    // ----------------------

    // Update User Role - Make Agent
    app.patch("/users/agent/:id",verifyAdmin, async (req, res) => {
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
