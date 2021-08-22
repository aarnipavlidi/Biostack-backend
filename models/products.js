// This exercise has been commented by Aarni Pavlidi, if you have any questions or suggestions with the code,
// then please contact me by sending email at me@aarnipavlidi.fi <3

const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')


const schema = new mongoose.Schema({
  productTitle: {
    type: String,
    required: true,
    minlength: 5
  },
  productDescription: {
    type: String,
    required: true,
    minlength: 5
  },
  productSize: {
    type: String,
    required: true,
    maxlength: 3
  },
  productPrice: {
    type: String,
    required: true,
    minlength: 1
  },
  productGroupName: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  },
})

schema.plugin(uniqueValidator)
module.exports = mongoose.model('Products', schema)
