// This exercise has been commented by Aarni Pavlidi, if you have any questions or suggestions with the code,
// then please contact me by sending email at me@aarnipavlidi.fi <3

require('dotenv').config() // Sovellus ottaa käyttöön "dotenv" kirjaston, jotta voidaan tuoda erilaisia muuttujia => ".env" tiedostosta.
const { ApolloServer, UserInputError, gql } = require('apollo-server') // Alustetaan muuttujat "ApolloServer", "UserInputError" sekä "gql", jotka hyödyntävät "apollo-server":in kirjastoa sovelluksessa.

const mongoose = require('mongoose') // Alustetetaan muuttuja "mongoose", joka ottaa käyttöönsä "mongoose" nimisen kirjaston sovellusta varten.
const { v4: uuid } = require('uuid') // Alustetaan muuttuja "uuid", joka hyödyntää "uuid" nimistä kirjastoa. Tämän avulla voidaan lisätä "random" id:n arvo, kun esim. halutaan lisätä uusi arvo tietokantaan.

const Users = require('./models/users') // Alustetaan muuttuja "Authors", joka ottaa käyttöön "authors.js" tiedoston sisällön sovellusta varten.
const Products = require('./models/products')

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const products = require('./models/products')
const JWT_SECRET = process.env.SECRET_KEY

// Alustetaan muuttuja "database", joka on yhtä kuin kyseisen muuttujan arvo eli,
// "MONGODB_URI". Muista, että olemme erikseen luoneet ".env" nimisen tiedoston
// projektin juureen, josta löytyy erikseen kyseisen muuttujan arvo.
const database = process.env.MONGODB_URI
console.log('Connecting to following server:', database) // Tulostetaan kyseinen arvo takaisin konsoliin näkyviin.

// Funktion "mongoose.connect(...)" avulla yhdistetään tietokantaan (MongoDB). Lisää tietoa funktion käytöstä löytyy @ https://mongoosejs.com/docs/connections.html
mongoose.connect(database, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
  .then(() => { // Kun palvelimeen on yhdistetty, niin suoritetaan {...} sisällä olevat asiat.
    console.log('Connected successfully to the MongoDB! :)') // Tulostetaan kyseinen arvo takaisin konsoliin näkyviin.
  })
  .catch((error) => { // Jos palvelimeen yhdistämisessä tulee ongelmia, niin suoritetaan "catch(...)" funktio ja sitä kautta {...} sisällä olevat asiat.
    console.log('There was a problem while trying connect to the MongoDB! Error was following:', error.message) // Tulostetaan kyseinen arvo takaisin konsoliin näkyviin.
  })


// Alustetaan muuttuja "typeDefs", joka sisältää sovelluksen käyttämän GraphQL-skeeman. Lisää tästä löytyy: https://graphql.org/learn/schema/
const typeDefs = gql`

  type Query {
    showAllUsers: [User!]!
    showAllProducts: [Product!]!
    showCurrentProduct(productID: String): Product!
    me: User
  }

  type User {
    _id: ID!
    name: String!
    username: String!
    email: String!
    rating: String
    products: [Product!]
  }

  type Product {
    _id: ID!
    productTitle: String!
    productDescription: String!
    productSize: String!
    productPrice: String!
    productGroupName: String!
    owner: User!
  }

  type Token {
    value: String!
  }

  type Response {
    response: String!
  }

  type Mutation {

    createUser(
      name: String!
      username: String!
      password: String!
      email: String!
      rating: String
    ): User!

    createProduct(
      productTitle: String!
      productDescription: String!
      productSize: String!
      productPrice: String!
      productGroupName: String!
      owner: String!
    ): Product!

    deleteProduct(
      currentProductID: String!
    ): Response

    login(
      username: String!
      password: String!
    ): Token

    deleteUser(
      id: String!
    ): Response

  }
`

const productsRelation = async (getProductID) => {
  try {
    const findProducts = await Products.find({_id: { $in: getProductID }})
    return findProducts.map(results => ({
      ...results._doc,
      owner: usersRelation.bind(this, results._doc.owner)
    }))
  } catch (error) {
    throw error
  }
};

const usersRelation = async (getUserID) => {
  try {
    const findUsers = await Users.findById(getUserID)
    return {
      ...findUsers._doc,
      products: productsRelation.bind(this, findUsers._doc.products)
    }
  } catch (error) {
    throw error
  }
};

// Alustetaan muuttuja "resolvers", joka sisältää palvelimen "resolverit". Tämän avulla määritellään, että miten GraphQL-kyselyihin vastataan.
// Lisää tästä löytyy: https://www.apollographql.com/docs/apollo-server/data/resolvers/#resolver-map
const resolvers = {
  Query: {
    showAllUsers: async () => {
      try {
        const getAllUsers = await Users.find()
        return getAllUsers.map(results => ({
          ...results._doc,
          products: productsRelation.bind(this, results._doc.products)
        }))
      } catch (error) {
        throw error
      }
    },
    showAllProducts: async () => {
      try {
        const getAllProducts = await Products.find()
        return getAllProducts.map(results => ({
          ...results._doc,
          owner: usersRelation.bind(this, results._doc.owner)
        }))
      } catch (error) {
        throw error
      }
    },

    showCurrentProduct: async (_, { productID }) => {
      try {
        const getCurrentProduct = await Products.findById(productID)
        return {
          ...getCurrentProduct._doc,
          owner: usersRelation.bind(this, getCurrentProduct._doc.owner)
        }
      } catch (error) {
        throw error
      }
    },

    me: async (root, args, context) => {
      
      try {
        const currentUserData = await Users.findById(context.currentUserLogged.id)
        return {
          ...currentUserData._doc,
          products: productsRelation.bind(this, currentUserData._doc.products)
        }
      } catch (error) {
        throw error
      }
    },
  },

  Mutation: {
    createUser: async (_, { name, username, password, email }) => {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Users({ name, username, password: hashedPassword, email })
        await newUser.save()
        return newUser;
      } catch (error) {
        throw error
      }
    },
    createProduct: async (_, { productTitle, productDescription, productSize, productPrice, productGroupName, owner: currentUserID }) => {

      const newProduct = new Products({ productTitle, productDescription, productSize, productPrice, productGroupName, owner: currentUserID })

      try {
        const savedProduct = await newProduct.save()
        const currentUserData = await Users.findById(currentUserID)
        currentUserData.products.push(newProduct)
        await currentUserData.save()
        return {
          ...savedProduct._doc,
          owner: usersRelation.bind(this, currentUserID)
        }
      } catch (error) {
        throw error
      }
    },

    deleteProduct: async (root, args, context) => {

      const loggedUserID = context.currentUserLogged.id;
      const findCurrentProduct = await Products.findById(args.currentProductID);

      if (findCurrentProduct && loggedUserID === mongoose.Types.ObjectId(findCurrentProduct.owner)) {
        await Products.collection.deleteOne({"_id": mongoose.Types.ObjectId(args.currentProductID)});

        return {
          response: `You have successfully deleted your product called "${findCurrentProduct.productTitle}" from the app!`
        }
      } else {
        throw new UserInputError('You are either not authorized to delete current item from the app or it has been already deleted!');
      }
    },

    login: async (root, args) => {

      const findCurrentUsername = await Users.findOne({ username: args.username });

      if (!findCurrentUsername) {
        throw new UserInputError('You tried to login with wrong credentials. Please try again!');
      }

      const checkPasswordMatch = await bcrypt.compare(args.password, findCurrentUsername.password);

      if (!checkPasswordMatch) {
        throw new UserInputError('You tried to login with wrong credentials. Please try again!');
      } else {
        const tokenForUser = {
          username: findCurrentUsername.username,
          id: findCurrentUsername._id
        };

        return {
          value: jwt.sign(tokenForUser, JWT_SECRET)
        }
      }
    },

    deleteUser: async (root, args, context) => {

      const loggedUserID = context.currentUserLogged.id;
      const loggedUserName = context.currentUserLogged.name;

       const objects = [
        mongoose.Types.ObjectId(loggedUserID)
      ];

      const findCurrentUserID = await Users.findOne({ _id: args.id });

      if (loggedUserID === args.id && findCurrentUserID) {
        await Products.collection.deleteMany({ owner: { $in: objects }});
        await Users.findByIdAndRemove(args.id).exec();

        return {
          response: `You successfully deleted your account from app. Thank you ${loggedUserName} for using our app and we hope you come back again some day! <3`
        }
      } else {
        throw new UserInputError('You tried to delete user, which does not exist on database or you are not authorized to do so. Please try again!');
      }
    }
  }
}

// Alustetaan muuttuja "server", joka suorittaa kyseisen funktion, jossa
// käytetään parametreinä "typeDefs" sekä "resolvers" muuttujia.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {

    const auth = req ? req.headers.authorization : null;

    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUserLogged = await Users.findById(decodedToken.id);

      return {
        currentUserLogged
      }
    }
  }
})

server.listen().then(({ url }) => { // Luo serverin portille 4000, jonka jälkeen tulostaa terminaaliin alla olevan tekstin takaisin käyttäjälle näkyviin.
  console.log(`Server ready at ${url}`)
})
