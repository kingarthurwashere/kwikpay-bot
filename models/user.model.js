const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

const User = new Schema( {
    _id: { type: Schema.Types.ObjectId, auto: true },
    firstName: {type: String},
    surName: {type: String},
    chatId: { type: String },
    phoneNumber: { type: String },
    dateCreated: {type: Date},
    role: {type: String, enum:['user','admin']}
} );

module.exports = mongoose.model('user', User);