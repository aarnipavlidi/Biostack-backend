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

  type User {
    _id: ID!
    name: String!
    username: String!
    email: String!
    rating: Int
    products: [Product!]
  }

  type Product {
    _id: ID!
    productTitle: String!
    productDescription: String!
    productPrice: Int!
    productGroupName: String!
    owner: User!
  }

  type Token {
    value: String!
  }

  type Response {
    response: String!
  }

  type Query {
    showAllUsers: [User!]!
    showAllProducts: [Product!]!
    me: User
  }

  type Mutation {

    createUser(
      name: String!
      username: String!
      password: String!
      email: String!
      rating: Int
    ): User!

    createProduct(
      productTitle: String!
      productDescription: String!
      productPrice: Int!
      productGroupName: String!
      owner: String!
    ): Product!

    login(
      username: String!
      password: String!
    ): Token

    deleteUser(
      id: String!
    ): Response

  }
`

const productsRelation = async (productID) => {
  try {
    const currentProduct = await Products.find({_id: { $in: productID }})
    return currentProduct.map(results => ({
      ...results._doc,
      owner: usersRelation.bind(this, results._doc.owner)
    }))
  } catch (error) {
    throw error
  }
};

const usersRelation = async (userID) => {
  try {
    const currentUser = await Users.findById(userID)
    return {
      ...currentUser._doc,
      products: productsRelation.bind(this, currentUser._doc.products)
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
        const findAllUsers = await Users.find()
        return findAllUsers.map(results => ({
          ...results._doc,
          products: productsRelation.bind(this, results._doc.products)
        }))
      } catch (error) {
        throw error
      }
    },

    showAllProducts: async () => {
      try {
        const findAllProducts = await Products.find()
        return findAllProducts.map(results => ({
          owner: usersRelation.bind(this, results._doc.owner)
        }))
      } catch (error) {
        throw error
      }
    },
    me: (root, args, context) => {
      return context.currentUserLogged
    }
  },

  Mutation: {
    createUser: async (root, args) => {

      const hashedPassword = await bcrypt.hash(args.password, 10);

      const newUser = new Users({
        name: args.name,
        username: args.username,
        password: hashedPassword,
        email: args.email,
        rating: args.rating
      });

      try {
        await newUser.save()
        return newUser
      } catch (error) {
        console.log(error.message)
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },

    createProduct: async (root, args, context) => {

      const getCurrentUser = await Users.findById(args.owner)
      const loggedUserID = context.currentUserLogged ? context.currentUserLogged.id : null;

      const newProduct = new Products({
        productTitle: args.productTitle,
        productDescription: args.productDescription,
        productPrice: args.productPrice,
        productGroupName: args.productGroupName,
        owner: args.owner
      });

      if (loggedUserID === args.owner && getCurrentUser) {
        const savedNewProduct = await newProduct.save()

        getCurrentUser.products.push(newProduct)
        await getCurrentUser.save()

        return {
          ...savedNewProduct._doc,
          owner: usersRelation.bind(this, args.owner)
        }
      } else {
        throw new UserInputError('You are not authorized to add new product to the database!')
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

      const findCurrentUserID = await Users.findOne({ _id: args.id });

      if (loggedUserID === args.id && findCurrentUserID) {
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
