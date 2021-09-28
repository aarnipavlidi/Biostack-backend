// This exercise has been commented by Aarni Pavlidi, if you have any questions or suggestions with the code,
// then please contact me by sending email at me@aarnipavlidi.fi <3

const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 5
  },
  password: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5
  },
  rating: {
    type: String,
    default: "0"
  },
  facebookID: {
    type: String,
    unique: true,
  },
  facebookAvatar: {
    type: String,
    unique: true,
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Products'
  }],
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transactions'
  }],
})

schema.plugin(uniqueValidator)
module.exports = mongoose.model('Users', schema)
