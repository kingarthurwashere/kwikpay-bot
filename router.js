

 exports.register = (app) => {

    app.use('/api/stripe',require('./stripe'));

};
