var DbMixin = require("../mixins/db.mixin");
const { MoleculerClientError } = require("moleculer").Errors;
const { ForbiddenError } = require("moleculer-web").Errors;
var jwt=require("jsonwebtoken");
module.exports = {
    name: "users",
    mixins: [DbMixin("users")],
    settings: {
        fields: ["username", "password", "_id"],
        entityValidator: {
            username: "string",
            password: "string",

        },
        JWT_SECRET: process.env.JWT_SECRET || "jwt-conduit-secret",

    },
    methods: {
        /**
         * Loading sample data to the collection.
         * It is called in the DB.mixin after the database
         * connection establishing & the collection is empty.
         */
        async seedDB() {
            await this.adapter.insertMany([
                { username: "sara", password: "sara" },

            ]);
        },
        	/**
		 * Generate a JWT token from user entity
		 *
		 * @param {Object} user
		 */
		generateJWT(user) {
			const today = new Date();
			const exp = new Date(today);
			exp.setDate(today.getDate() + 60);

			return jwt.sign({
				id: user._id,
				username: user.username,
				exp: Math.floor(exp.getTime() / 1000)
			}, this.settings.JWT_SECRET);
		},

		/**
		 * Transform returned user entity. Generate JWT token if neccessary.
		 *
		 * @param {Object} user
		 * @param {Boolean} withToken
		 */
		transformEntity(user, withToken, token) {
			if (user) {
				//user.image = user.image || "https://www.gravatar.com/avatar/" + crypto.createHash("md5").update(user.email).digest("hex") + "?d=robohash";
				if (withToken)
					user.token = token || this.generateJWT(user);
			}

			return { user };
		},

	
    },
    actions: {
        addUser: {
            rest: "POST /register",
            params: {
                username: { type: "string" },
                password: { type: "string" }
            },
            async handler(ctx) {
                let entity = {username:ctx.params.username,password:ctx.params.password};
                await this.validateEntity(entity);
                if (entity.username) {
                    const found = await this.adapter.findOne({ username: entity.username });
                    if (found)
                        throw new MoleculerClientError("Username already exist!", 422, "", [{ field: "username", message: "is exist" }]);
                }
                const doc = await this.adapter.insert(entity);
                const user = await this.transformDocuments(ctx, {}, doc);
                const json = await this.transformEntity(user, false, ctx.meta.token);
                await this.entityChanged("created", json, ctx);
                return json;
            }
        },
        /**
		 * Login with username & password
		 *
		 * @actions
		 * @param {Object} user - User credentials
		 *
		 * @returns {Object} Logged in user with token
		 */
		login: {
			rest: "POST /login",
            params: {
                username: { type: "string" },
                password: { type: "string" }
            },
			async handler(ctx) {
				const  username = ctx.params.username;
                const  password = ctx.params.password;

				const user = await this.adapter.findOne({ username });
				if (!user)
					throw new MoleculerClientError("Username or password is invalid!", 422, "", [{ field: "email", message: "is not found" }]);

				const res = password== user.password;
				if (!res)
					throw new MoleculerClientError("Wrong password!", 422, "", [{ field: "email", message: "is not found" }]);

				// Transform user entity (remove password and all protected fields)
				const doc = await this.transformDocuments(ctx, {}, user);
				return await this.transformEntity(doc, true, ctx.meta.token);
			}
		},
        resolveToken: {
			cache: {
				keys: ["token"],
				ttl: 60 * 60 // 1 hour
			},
			params: {
				token: "string"
			},
			async handler(ctx) {
				const decoded = await new this.Promise((resolve, reject) => {
					jwt.verify(ctx.params.token, this.settings.JWT_SECRET, (err, decoded) => {
						if (err)
							return reject(err);

						resolve(decoded);
					});
				});

				if (decoded.id)
					return this.getById(decoded.id);
			}
		},
        get: {
			rest: "GET /:id"
		},

        me: {
			auth: "required",
			rest: "GET /myDetails",
			
			async handler(ctx) {
                if(!ctx.meta.user)
                    {
                        throw new MoleculerClientError("Token is not there",422);
                    }
               const user = await this.getById(ctx.meta.user._id);
				if (!user)
					throw new MoleculerClientError("User not found!", 400);

				const doc = await this.transformDocuments(ctx, {}, user);
				return await this.transformEntity(doc, true, ctx.meta.token);
			}
		},



    }
}
