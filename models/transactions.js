// This exercise has been commented by Aarni Pavlidi, if you have any questions or suggestions with the code,
// then please contact me by sending email at me@aarnipavlidi.fi <3

const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const schema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  productID: {
    type: String,
    required: true,
  },
  productTitle: {
    type: String,
    required: true,
  },
  productSize: {
    type: String,
    required: true,
  },
  productPrice: {
    type: String,
    required: true,
  },
  productType: {
    type: String,
    required: true,
  },
  productImage: {
    type: Number,
    required: true,
  },
  sellerID: {
    type: String,
  },
  sellerName: {
    type: String,
  },
  sellerEmail: {
    type: String,
  },
  buyerID: {
    type: String,
  },
  buyerName: {
    type: String,
  },
  buyerEmail: {
    type: String,
  },
  shippingMethod: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  paymentTotal: {
    type: String,
    required: true,
  },
})

schema.plugin(uniqueValidator)

module.exports = mongoose.model('Transactions', schema)
