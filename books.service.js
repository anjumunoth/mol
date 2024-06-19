var DbMixin = require("../mixins/db.mixin");
const { MoleculerClientError } = require("moleculer").Errors;
const { ForbiddenError } = require("moleculer-web").Errors;

module.exports = {
    name: "books",
    mixins: [DbMixin("books")],
    settings: {
        fields: ["bookId", "bookName", "author", "price", "_id"],
        entityValidator: {
            bookId: "string",
            bookName: "string",
            author: "string",
            price: "number",

        }
    },
    methods: {
        /**
         * Loading sample data to the collection.
         * It is called in the DB.mixin after the database
         * connection establishing & the collection is empty.
         */
        async seedDB() {
            await this.adapter.insertMany([
                { bookName: "Samsung Galaxy S10 Plus", price: 704, bookId: "b101", author: "a1" },
                { bookName: "iPhone 11 Pro", price: 999, bookId: "b101", author: "a1" },
                { bookName: "Huawei P30 Pro", price: 679, bookId: "b101", author: "a1" },
            ]);
        }
    },

    actions: {
        remove: false,
        create: false,
        list: false,
        get: false,
        update: false,
        find: false,
        count: false,
        insert: false,
        add: {
            rest: "GET /",
            async handler(ctx) {

                const doc = await this.adapter.find()
                const json = await this.transformDocuments(ctx, ctx.params, doc);
                await this.entityChanged("got", json, ctx);

                return json;
            }
        },
        postBook: {
            rest: "POST /",
            params: {
                bookId: "string",
                bookName: "string",
                author: "string",
                price: "number",

            },
            async handler(ctx) {
                var bookToBeInserted = {
                    bookId: ctx.params.bookId,
                    bookName: ctx.params.bookName,
                    author: ctx.params.author,
                    price: ctx.params.price,
                };
                const doc = await this.adapter.insert(bookToBeInserted)
                const json = await this.transformDocuments(ctx, ctx.params, doc);
                await this.entityChanged("inserted", json, ctx);

                return json;

            }
        },
        deleteBook: {
            rest: "DELETE /",
            params: {
                _id: "string",

            },
            async handler(ctx) {

                const docCount = await this.adapter.removeById(ctx.params._id)

                //const json = await this.transformDocuments(ctx, ctx.params, doc);
                //await this.entityChanged("deleted", json, ctx);
                if (docCount == 1) {
                    return "Book details deleted successfully"
                }
                throw new MoleculerClientError("Book not found", 404);


            }
        },
        updateBook: {
            rest: "PUT /",
            params: {
                bookId: "string",
                bookName: "string",
                author: "string",
                price: "number",
                _id: "string"

            },
            async handler(ctx) {
                var bookToBeUpdated = {
                    bookId: ctx.params.bookId,
                    bookName: ctx.params.bookName,
                    author: ctx.params.author,
                    price: ctx.params.price,
                };
                const updateDoc = { "$set": bookToBeUpdated }
                const findDoc = await this.adapter.findById(ctx.params._id, updateDoc);
                if (findDoc) {
                    const doc = await this.adapter.updateById(ctx.params._id, updateDoc);
                    console.log("Doc in update books", doc);
                    const json = await this.transformDocuments(ctx, ctx.params, doc);
                    await this.entityChanged("updated", json, ctx);

                    return json;
                }
                else {
                    throw new MoleculerClientError("Book Id not found", 404)
                }

            }
        }

    }

}