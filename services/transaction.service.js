const Transaction = require('../models/transaction.model');


// Create Transaction
async function create(transactionParam){
    // Validate
    const duplicate = await Transaction.findOne({ chatId: transactionParam.chatId });
    if (duplicate) {
        return { 
            status: 409,
            message: 'Transaction  already Exists'
         };
    }
   

    let transaction = new Transaction(transactionParam);
    

    // Save Transaction
    await transaction.save();

    return Transaction.findOne({ chatId: transaction.chatId});

}


// Update Transaction
async function update(id, transactionParam) {
    let transaction = await Transaction.findById(id);
    // Validate
    if (!transaction) throw 'Transaction not Found';

    // Copy transactionParam
    Object.assign(transaction, transactionParam);

    await transaction.save();

    return Transaction.findById(id);

}

async function getOne(chatId){

    return Transaction.findOne({chatId: chatId});
}

async function findIncompleteTransactions(){
    return Transaction.find({$and:[{paymentStatus:'completed'},{transactionStatus:'pending'}]})
}

module.exports = { create,getOne, update,findIncompleteTransactions};
