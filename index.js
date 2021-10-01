// This exercise has been commented by Aarni Pavlidi, if you have any questions or suggestions with the code,
// then please contact me by sending email at me@aarnipavlidi.fi <3

require('dotenv').config() // Sovellus ottaa käyttöön "dotenv" kirjaston, jotta voidaan tuoda erilaisia muuttujia => ".env" tiedostosta.
const { ApolloServer, UserInputError, gql } = require('apollo-server') // Alustetaan muuttujat "ApolloServer", "UserInputError" sekä "gql", jotka hyödyntävät "apollo-server":in kirjastoa sovelluksessa.

const mongoose = require('mongoose') // Alustetetaan muuttuja "mongoose", joka ottaa käyttöönsä "mongoose" nimisen kirjaston sovellusta varten.
const { v4: uuid } = require('uuid') // Alustetaan muuttuja "uuid", joka hyödyntää "uuid" nimistä kirjastoa. Tämän avulla voidaan lisätä "random" id:n arvo, kun esim. halutaan lisätä uusi arvo tietokantaan.

const Users = require('./models/users') // Alustetaan muuttuja "Authors", joka ottaa käyttöön "authors.js" tiedoston sisällön sovellusta varten.
const Products = require('./models/products')
const Transactions = require('./models/transactions')

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

  type ProductConnection {
    edges: [ProductEdge]
    pageInfo: PageInfo
  }

  type ProductEdge {
    cursor: ID!,
    node: Product
  }

  type PageInfo {
    endCursor: ID,
    hasNextPage: Boolean!,
  }

  type Query {
    showAllUsers: [User!]!
    showAllProducts(first: Int!, cursor: ID, search: String): ProductConnection
    showCurrentProduct(productID: String): Product!
    showCurrentTransaction(getTransactionID: String): Transaction
    me: User
  }

  type User {
    _id: ID!
    name: String!
    username: String!
    email: String!
    rating: String
    facebookAvatar: String
    products: [Product!]
    transactions: [Transaction!]
  }

  type ProductImage {
    name: String!
    value: Int!
  }

  type Product {
    _id: ID!
    productTitle: String!
    productDescription: String!
    productSize: String!
    productPrice: String!
    productImage: ProductImage!
    owner: User!
  }

  type Transaction {
    _id: ID!
    date: String!
    type: String!
    productID: String!
    productTitle: String!
    productSize: String!
    productPrice: String!
    productType: String!
    sellerID: String
    sellerName: String
    sellerEmail: String
    buyerID: String
    buyerName: String
    buyerEmail: String
    shippingMethod: String!
    paymentMethod: String!
    paymentTotal: String!
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

    updateUser(
      newUserNameValue: String
      newUserEmailValue: String
    ): Response

    createProduct(
      productTitle: String!
      productDescription: String!
      productSize: String!
      productPrice: String!
      productType: String!
      productImageValue: Int!
      owner: String!
    ): Product!

    createTransaction(
      date: String!
      productID: String!
      productTitle: String!
      productSize: String!
      productPrice: String!
      productType: String!
      sellerID: String!
      sellerName: String!
      sellerEmail: String!
      shippingMethod: String!
      paymentMethod: String!
      paymentTotal: String!
    ): Transaction!

    deleteProduct(
      currentProductID: String!
    ): Response

    deleteManyProduct: Response

    login(
      username: String!
      password: String!
    ): Token

    facebookLogin(
      getFacebookID: String!
      getFacebookAvatar: String!
      getFacebookEmail: String!
      getFacebookName: String!
      getFacebookUsername: String!
      getFacebookCity: String!
      getFacebookRegionID: Int!
      getFacebookLatitude: Float!
      getFacebookLongitude: Float!
    ): Token

    deleteUser(
      id: String!
    ): Response
  }
`

const transactionsRelation = async (getTransactionID) => {
  try {
    const findTransactions = await Transactions.find({_id: { $in: getTransactionID }})
    return findTransactions.map(results => ({
      ...results._doc,
    }))
  } catch (error) {
    throw error
  }
};

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

    showAllProducts: async (_, { first, cursor, search }) => {

      const getAllProducts = await Products.find({ productTitle: { $regex: search, $options: 'i' } });

      const cursorIndex = !cursor
        ? 0
        : getAllProducts.findIndex(results => String(results._id) === cursor) + 1;

      const sliceOfProducts = getAllProducts.slice(cursorIndex, cursorIndex + first);

      return {
        edges: sliceOfProducts.map(results => ({
          cursor: results._id,
          node: {
            ...results._doc,
            owner: usersRelation.bind(this, results._doc.owner)
          },
        })),
        pageInfo: {
          endCursor: sliceOfProducts[sliceOfProducts.length - 1]?._id,
          hasNextPage: cursorIndex + first < getAllProducts.length,
        },
      };
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

    showCurrentTransaction: async (_, { getTransactionID }) => {
      try {
        if (getTransactionID) {
          const getCurrentTransaction = await Transactions.findById(getTransactionID);
          return {
            ...getCurrentTransaction._doc
          }
        } else {
          return null
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
          products: productsRelation.bind(this, currentUserData._doc.products),
          transactions: transactionsRelation.bind(this, currentUserData._doc.transactions)
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

    updateUser: async (_, { newUserNameValue, newUserEmailValue }, context) => {

      const loggedUserID = await context.currentUserLogged?._id === undefined
        ? null
        : context.currentUserLogged._id;

      try {
        const findCurrentUser = {"_id": mongoose.Types.ObjectId(loggedUserID)};
        const updateCurrentUser = newUserNameValue && newUserEmailValue
          ? { $set: { 'name': newUserNameValue, "email": newUserEmailValue }}
          : !newUserEmailValue
          ? { $set: { 'name': newUserNameValue }}
          : { $set: { 'email': newUserEmailValue }};

        if (!loggedUserID) {
          throw new Error('Could not update current value. You either not authorized or user does not exist!')
        } else {
          const updatedUser = await Users.collection.findOneAndUpdate(findCurrentUser, updateCurrentUser);
          return {
            response: "You have successfully updated your account information into new value!"
          };
        };
      } catch (error) {
        return {
          response: error.message
        };
      };
    },

    createProduct: async (_, { productTitle, productDescription, productSize, productPrice, productType, productImageValue, owner: currentUserID }) => {

      const newProduct = new Products({
        productTitle,
        productDescription,
        productSize,
        productPrice,
        productImage: {
          name: productType,
          value: productImageValue
        },
        owner: currentUserID
      });

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

    createTransaction: async (_, { date, productID, productTitle, productSize, productPrice, productType, sellerID, sellerName, sellerEmail, shippingMethod, paymentMethod, paymentTotal }, context) => {

      const loggedUserID = await context.currentUserLogged._id;
      const loggedUserName = await context.currentUserLogged.name;
      const loggedUserEmail = await context.currentUserLogged.email;

      const buyerID = String(loggedUserID);
      const buyerName = loggedUserName;
      const buyerEmail = loggedUserEmail;

      const transactionBuyer = new Transactions({ date, type: "Purchased", productID, productTitle, productSize, productPrice, productType, sellerID, sellerName, sellerEmail, shippingMethod, paymentMethod, paymentTotal })
      const transactionSeller = new Transactions({ date, type: "Sold", productID, productTitle, productSize, productPrice, productType, buyerID, buyerName, buyerEmail, shippingMethod, paymentMethod, paymentTotal })

      try {
        const saveTransactionBuyer = await transactionBuyer.save()
        const saveTransactionSeller = await transactionSeller.save()

        const getBuyerData = await Users.findById(buyerID)
        getBuyerData.transactions.push(transactionBuyer)
        await getBuyerData.save()

        const getSellerData = await Users.findById(sellerID)
        getSellerData.transactions.push(transactionSeller)
        await getSellerData.save()

        await Products.collection.deleteOne({"_id": mongoose.Types.ObjectId(productID)})

        return {
          ...saveTransactionBuyer._doc
        }
      } catch (error) {
        throw error
      }
    },

    deleteProduct: async (root, args, context) => {

      const loggedUserID = await context.currentUserLogged._id;
      const findCurrentProduct = await Products.findById(args.currentProductID);

      // Fixed earlier problem, the reason why logged user could not delete item from the app,
      // was because "context" variable returns "_id" object and that value is not string. So
      // had to improvise a little bit and make sure that both variables => "loggedUserID" and
      // "findCurrentProduct.owner" are strings, so we are able to compare if they are equal or
      // not. Previously they always were not equal (false) and hence if-condition always failed.
      if (findCurrentProduct && String(loggedUserID) === String(mongoose.Types.ObjectId(findCurrentProduct.owner))) {
        await Products.collection.deleteOne({"_id": mongoose.Types.ObjectId(args.currentProductID)});

        return {
          response: `You have successfully deleted your product called "${findCurrentProduct.productTitle}" from the app!`
        }
      } else {
        throw new UserInputError('You are either not authorized to delete current item from the app or it has been already deleted!');
      }
    },

    deleteManyProduct: async (root, args, context) => {
      try {
        const loggedUserID = await context.currentUserLogged._id;

        const countUserProducts = await Products.collection.find({ "owner": mongoose.Types.ObjectId(loggedUserID)}).count();

        if (loggedUserID && countUserProducts === 0) {
          throw new Error('You do not have currently any products listed on the app!')
        } else {
          const deleteUserProducts = await Products.collection.deleteMany({ "owner": mongoose.Types.ObjectId(loggedUserID)});
          return {
            response: "You have successfully deleted all of your listed products from the app!"
          }
        }
      } catch (error) {
        return {
          response: error.message
        }
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

    facebookLogin: async (_, { getFacebookID, getFacebookAvatar, getFacebookEmail, getFacebookName, getFacebookUsername, getFacebookCity, getFacebookRegionID, getFacebookLatitude, getFacebookLongitude }) => {

      const findFacebookUsername = await Users.findOne({ facebookID: getFacebookID });

      if (!findFacebookUsername) {
        const newFacebookUser = new Users({
          name: getFacebookName,
          username: getFacebookUsername,
          email: getFacebookEmail,
          location: {
            city: getFacebookCity,
            region_id: getFacebookRegionID,
            latitude: getFacebookLatitude,
            longitude: getFacebookLongitude,
          },
          facebookID: getFacebookID,
          facebookAvatar: getFacebookAvatar
        });

        await newFacebookUser.save();

        const tokenForUser = {
          username: newFacebookUser.username,
          id: newFacebookUser._id
        };

        return {
          value: jwt.sign(tokenForUser, JWT_SECRET)
        }
      } else {

        const tokenForUser = {
          username: findFacebookUsername.username,
          id: findFacebookUsername._id
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
