// This exercise has been commented by Aarni Pavlidi, if you have any questions or suggestions with the code,
// then please contact me by sending email at me@aarnipavlidi.fi <3

require('dotenv').config() // Sovellus ottaa käyttöön "dotenv" kirjaston, jotta voidaan tuoda erilaisia muuttujia => ".env" tiedostosta.
const { ApolloServer, UserInputError, gql } = require('apollo-server') // Alustetaan muuttujat "ApolloServer", "UserInputError" sekä "gql", jotka hyödyntävät "apollo-server":in kirjastoa sovelluksessa.
//const { ApolloServerPluginLandingPageProductionDefault, ApolloServerPluginLandingPageLocalDefault } = require('apollo-server-core');
const mongoose = require('mongoose') // Alustetetaan muuttuja "mongoose", joka ottaa käyttöönsä "mongoose" nimisen kirjaston sovellusta varten.
const { v4: uuid } = require('uuid') // Alustetaan muuttuja "uuid", joka hyödyntää "uuid" nimistä kirjastoa. Tämän avulla voidaan lisätä "random" id:n arvo, kun esim. halutaan lisätä uusi arvo tietokantaan.

const Authors = require('./models/authors') // Alustetaan muuttuja "Authors", joka ottaa käyttöön "authors.js" tiedoston sisällön sovellusta varten.

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

let authors = [ // Alustetaan muuttuja "authors", joka saa käyttöönsä [...] sisällä olevan taulukon arvot.
  {
    name: 'Robert Martin',
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
]

// Alustetaan muuttuja "typeDefs", joka sisältää sovelluksen käyttämän GraphQL-skeeman. Lisää tästä löytyy: https://graphql.org/learn/schema/
const typeDefs = gql`
  type Author {
    name: String!
    born: Int!
    id: ID!
  }
  type AuthorNameWithBookCount {
    name: String!
    born: Int!
    bookCount: Int!
  }
  type Query {
    authorsCount: Int!
  }
  type Mutation {
    addAuthor(
      name: String!
      born: Int!
    ): Author
  }
`

// Alustetaan muuttuja "resolvers", joka sisältää palvelimen "resolverit". Tämän avulla määritellään, että miten GraphQL-kyselyihin vastataan.
// Lisää tästä löytyy: https://www.apollographql.com/docs/apollo-server/data/resolvers/#resolver-map
const resolvers = {
  Query: {
    // Kun suoritetaan "authorsCount" query niin sovellus laskee, että kuinka monta arvoa on yhteensä "authors" kokoelmassa ja palauttaa yhteenlasketun arvon takaisin käyttäjälle.
    authorsCount: () => Authors.collection.countDocuments(), // Lisää funktiosta: https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments/
  },

  Mutation: {
    // Tehtävää "8.13: Tietokanta, osa 1" varten pitää luoda myös "addAuthor" mutaatio,
    // jotta voimme lisätä uuden kirjan tietokantaan. Tämä johtuu siitä, koska olemme
    // luoneet kirjojen rakenteelle ("models/books.js") seuraavan kohdan:
    //    author: {
    //      type: mongoose.Schema.Types.ObjectId,
    //      ref: 'Author'
    //    }
    // Tämä siis tarkoittaa sitä, että "author" objektille pitää löytyä jo entuudestaan
    // oleva kirjailijan arvo tietokannasta eli "authors" kokoelmasta. Kun uusi kirjailija
    // on lisätty talteen tietokantaan, niin kyseisen arvon id:n objektin avulla pystytään
    // rakentamaan (ref: 'Author') yhteys kahden (2) eri kokoelman välillä.

    // Alustetaan "addAuthor" mutaatio, jonka tarkoituksena on lisätä aina uusi kirjailija
    // tietokantaan talteen, kun kyseiseen funktioon tehdään viittaus.
    addAuthor: async (root, args) => {
      // Alustetaan muuttuja "newAuthor", joka on yhtä kuin kyseinen funktio. Muuttuja
      // siis sijoittaa parametrin kautta tulevan "args" muuttujan datan eteenpäin =>
      // "Authors" muuttujaan, joka noudattaa kyseisen muuttujan rakennetta.
      const newAuthor = new Authors({ ...args })

      // Sovellus ensin yrittää suorittaa => "try {...}" sisällä olevat asiat, jos
      // sen aikana tulee virheitä, niin suoritetaan => "catch" funktio.
      try {
        await newAuthor.save() // Tallennetaan "newAuthor" muuttujan data tietokantaan.
        return newAuthor // Kun mutaatio on suoritettu, niin funktio palauttaa takaisin "newAuthor" muuttujan datan käyttäjälle näkyviin.
      } catch (error) { // Jos mutaation suorittamisessa tulee virheitä, niin suoritetaan {...} sisällä olevat asiat.
        console.log(error.message) // Tulostaa terminaaliin myös näkyviin virheen arvon eli "error.message".
        throw new UserInputError(error.message, {
          invalidArg: args,
        })
      }
    }
  }
}


// Alustetaan muuttuja "server", joka suorittaa kyseisen funktion, jossa
// käytetään parametreinä "typeDefs" sekä "resolvers" muuttujia.
const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => { // Luo serverin portille 4000, jonka jälkeen tulostaa terminaaliin alla olevan tekstin takaisin käyttäjälle näkyviin.
  console.log(`Server ready at ${url}`)
})
