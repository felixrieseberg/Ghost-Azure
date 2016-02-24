// # Post Model
var _              = require('lodash'),
    uuid           = require('node-uuid'),
    Promise        = require('bluebird'),
    sequence       = require('../utils/sequence'),
    errors         = require('../errors'),
    Showdown       = require('showdown-ghost'),
    converter      = new Showdown.converter({extensions: ['ghostgfm', 'footnotes', 'highlight']}),
    ghostBookshelf = require('./base'),
    events         = require('../events'),
    config         = require('../config'),
    baseUtils      = require('./base/utils'),
    i18n           = require('../i18n'),
    Post,
    Posts;

Post = ghostBookshelf.Model.extend({

    tableName: 'posts',

    emitChange: function emitChange(event, usePreviousResourceType) {
        var resourceType = this.get('page') ? 'page' : 'post';
        if (usePreviousResourceType) {
            resourceType = this.updated('page') ? 'page' : 'post';
        }
        events.emit(resourceType + '.' + event, this);
    },

    defaults: function defaults() {
        return {
            uuid: uuid.v4(),
            status: 'draft'
        };
    },

    initialize: function initialize() {
        var self = this;

        ghostBookshelf.Model.prototype.initialize.apply(this, arguments);

        this.on('saved', function onSaved(model, response, options) {
            return self.updateTags(model, response, options);
        });

        this.on('created', function onCreated(model) {
            model.emitChange('added');

            if (model.get('status') === 'published') {
                model.emitChange('published');
            }
        });

        this.on('updated', function onUpdated(model) {
            model.statusChanging = model.get('status') !== model.updated('status');
            model.isPublished = model.get('status') === 'published';
            model.wasPublished = model.updated('status') === 'published';
            model.resourceTypeChanging = model.get('page') !== model.updated('page');

            // Handle added and deleted for changing resource
            if (model.resourceTypeChanging) {
                if (model.wasPublished) {
                    model.emitChange('unpublished', true);
                }

                model.emitChange('deleted', true);
                model.emitChange('added');

                if (model.isPublished) {
                    model.emitChange('published');
                }
            } else {
                if (model.statusChanging) {
                    model.emitChange(model.isPublished ? 'published' : 'unpublished');
                } else {
                    if (model.isPublished) {
                        model.emitChange('published.edited');
                    }
                }

                // Fire edited if this wasn't a change between resourceType
                model.emitChange('edited');
            }
        });

        this.on('destroying', function onDestroying(model) {
            if (model.previous('status') === 'published') {
                model.emitChange('unpublished');
            }
            model.emitChange('deleted');
        });
    },

    saving: function saving(model, attr, options) {
        var self = this,
            tagsToCheck,
            title,
            i;

        options = options || {};
        // keep tags for 'saved' event and deduplicate upper/lowercase tags
        tagsToCheck = this.get('tags');
        this.myTags = [];

        _.each(tagsToCheck, function each(item) {
            for (i = 0; i < self.myTags.length; i = i + 1) {
                if (self.myTags[i].name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) {
                    return;
                }
            }

            self.myTags.push(item);
        });

        ghostBookshelf.Model.prototype.saving.call(this, model, attr, options);

        this.set('html', converter.makeHtml(this.get('markdown')));

        // disabling sanitization until we can implement a better version
        // this.set('title', this.sanitize('title').trim());
        title = this.get('title') || i18n.t('errors.models.post.untitled');
        this.set('title', title.trim());

        // ### Business logic for published_at and published_by
        // If the current status is 'published' and published_at is not set, set it to now
        if (this.get('status') === 'published' && !this.get('published_at')) {
            this.set('published_at', new Date());
        }

        // If the current status is 'published' and the status has just changed ensure published_by is set correctly
        if (this.get('status') === 'published' && this.hasChanged('status')) {
            // unless published_by is set and we're importing, set published_by to contextUser
            if (!(this.get('published_by') && options.importing)) {
                this.set('published_by', this.contextUser(options));
            }
        } else {
            // In any other case (except import), `published_by` should not be changed
            if (this.hasChanged('published_by') && !options.importing) {
                this.set('published_by', this.previous('published_by'));
            }
        }

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Post, this.get('slug') || this.get('title'),
                    {status: 'all', transacting: options.transacting, importing: options.importing})
                .then(function then(slug) {
                    self.set({slug: slug});
                });
        }
    },

    creating: function creating(model, attr, options) {
        options = options || {};

        // set any dynamic default properties
        if (!this.get('author_id')) {
            this.set('author_id', this.contextUser(options));
        }

        ghostBookshelf.Model.prototype.creating.call(this, model, attr, options);
    },

    /**
     * ### updateTags
     * Update tags that are attached to a post.  Create any tags that don't already exist.
     * @param {Object} savedModel
     * @param {Object} response
     * @param {Object} options
     * @return {Promise(ghostBookshelf.Models.Post)} Updated Post model
     */
    updateTags: function updateTags(savedModel, response, options) {
        var newTags = this.myTags,
            TagModel = ghostBookshelf.model('Tag');

        options = options || {};

        function doTagUpdates(options) {
            return Promise.props({
                currentPost: baseUtils.tagUpdate.fetchCurrentPost(Post, savedModel.id, options),
                existingTags: baseUtils.tagUpdate.fetchMatchingTags(TagModel, newTags, options)
            }).then(function fetchedData(results) {
                var currentTags = results.currentPost.related('tags').toJSON(options),
                    existingTags = results.existingTags ? results.existingTags.toJSON(options) : [],
                    tagOps = [],
                    tagsToRemove,
                    tagsToCreate;

                if (baseUtils.tagUpdate.tagSetsAreEqual(newTags, currentTags)) {
                    return;
                }

                // Tags from the current tag array which don't exist in the new tag array should be removed
                tagsToRemove = _.reject(currentTags, function (currentTag) {
                    if (newTags.length === 0) {
                        return false;
                    }
                    return _.any(newTags, function (newTag) {
                        return baseUtils.tagUpdate.tagsAreEqual(currentTag, newTag);
                    });
                });

                // Tags from the new tag array which don't exist in the DB should be created
                tagsToCreate = _.pluck(_.reject(newTags, function (newTag) {
                    return _.any(existingTags, function (existingTag) {
                        return baseUtils.tagUpdate.tagsAreEqual(existingTag, newTag);
                    });
                }), 'name');

                // Remove any tags which don't exist anymore
                _.each(tagsToRemove, function (tag) {
                    tagOps.push(baseUtils.tagUpdate.detachTagFromPost(savedModel, tag, options));
                });

                // Loop through the new tags and either add them, attach them, or update them
                _.each(newTags, function (newTag, index) {
                    var tag;

                    if (tagsToCreate.indexOf(newTag.name) > -1) {
                        tagOps.push(baseUtils.tagUpdate.createTagThenAttachTagToPost(TagModel, savedModel, newTag, index, options));
                    } else {
                        // try to find a tag on the current post which matches
                        tag = _.find(currentTags, function (currentTag) {
                            return baseUtils.tagUpdate.tagsAreEqual(currentTag, newTag);
                        });

                        if (tag) {
                            tagOps.push(baseUtils.tagUpdate.updateTagOrderForPost(savedModel, tag, index, options));
                            return;
                        }

                        // else finally, find the existing tag which matches
                        tag = _.find(existingTags, function (existingTag) {
                            return baseUtils.tagUpdate.tagsAreEqual(existingTag, newTag);
                        });

                        if (tag) {
                            tagOps.push(baseUtils.tagUpdate.attachTagToPost(savedModel, tag, index, options));
                        }
                    }
                });

                return sequence(tagOps);
            });
        }

        // Handle updating tags in a transaction, unless we're already in one
        if (options.transacting) {
            return doTagUpdates(options);
        } else {
            return ghostBookshelf.transaction(function (t) {
                options.transacting = t;

                return doTagUpdates(options);
            }).then(function () {
                // Don't do anything, the transaction processed ok
            }).catch(function failure(error) {
                errors.logError(
                    error,
                    i18n.t('errors.models.post.tagUpdates.error'),
                    i18n.t('errors.models.post.tagUpdates.help')
                );
                return Promise.reject(new errors.InternalServerError(
                    i18n.t('errors.models.post.tagUpdates.error') + ' ' + i18n.t('errors.models.post.tagUpdates.help') + error
                ));
            });
        }
    },

    // Relations
    author: function author() {
        return this.belongsTo('User', 'author_id');
    },

    created_by: function createdBy() {
        return this.belongsTo('User', 'created_by');
    },

    updated_by: function updatedBy() {
        return this.belongsTo('User', 'updated_by');
    },

    published_by: function publishedBy() {
        return this.belongsTo('User', 'published_by');
    },

    tags: function tags() {
        return this.belongsToMany('Tag').withPivot('sort_order').query('orderBy', 'sort_order', 'ASC');
    },

    fields: function fields() {
        return this.morphMany('AppField', 'relatable');
    },

    toJSON: function toJSON(options) {
        options = options || {};

        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        if (!options.columns || (options.columns && options.columns.indexOf('author') > -1)) {
            attrs.author = attrs.author || attrs.author_id;
            delete attrs.author_id;
        }

        if (!options.columns || (options.columns && options.columns.indexOf('url') > -1)) {
            attrs.url = config.urlPathForPost(attrs);
        }

        return attrs;
    },
    enforcedFilters: function enforcedFilters() {
        return this.isPublicContext() ? 'status:published' : null;
    },
    defaultFilters: function defaultFilters() {
        return this.isPublicContext() ? 'page:false' : 'page:false+status:published';
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {
            status: 'ASC',
            published_at: 'DESC',
            updated_at: 'DESC',
            id: 'DESC'
        };
    },

    /**
     * @deprecated in favour of filter
     */
    processOptions: function processOptions(options) {
        if (!options.staticPages && !options.status) {
            return options;
        }

        // This is the only place that 'options.where' is set now
        options.where = {statements: []};

        // Step 4: Setup filters (where clauses)
        if (options.staticPages && options.staticPages !== 'all') {
            // convert string true/false to boolean
            if (!_.isBoolean(options.staticPages)) {
                options.staticPages = _.contains(['true', '1'], options.staticPages);
            }
            options.where.statements.push({prop: 'page', op: '=', value: options.staticPages});
            delete options.staticPages;
        } else if (options.staticPages === 'all') {
            options.where.statements.push({prop: 'page', op: 'IN', value: [true, false]});
            delete options.staticPages;
        }

        // Unless `all` is passed as an option, filter on
        // the status provided.
        if (options.status && options.status !== 'all') {
            // make sure that status is valid
            options.status = _.contains(['published', 'draft'], options.status) ? options.status : 'published';
            options.where.statements.push({prop: 'status', op: '=', value: options.status});
            delete options.status;
        } else if (options.status === 'all') {
            options.where.statements.push({prop: 'status', op: 'IN', value: ['published', 'draft']});
            delete options.status;
        }

        return options;
    },

    /**
    * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
    * @param {String} methodName The name of the method to check valid options for.
    * @return {Array} Keys allowed in the `options` hash of the model's method.
    */
    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['importing', 'withRelated'],
                findPage: ['page', 'limit', 'columns', 'filter', 'order', 'status', 'staticPages'],
                add: ['importing']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    /**
     * Filters potentially unsafe model attributes, so you can pass them to Bookshelf / Knex.
     * @param {Object} data Has keys representing the model's attributes/fields in the database.
     * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
     */
    filterData: function filterData(data) {
        var permittedAttributes = this.prototype.permittedAttributes(),
            filteredData;

        // manually add 'tags' attribute since it's not in the schema
        permittedAttributes.push('tags');

        filteredData = _.pick(data, permittedAttributes);

        return filteredData;
    },

    // ## Model Data Functions

    /**
     * ### Find One
     * @extends ghostBookshelf.Model.findOne to handle post status
     * **See:** [ghostBookshelf.Model.findOne](base.js.html#Find%20One)
     */
    findOne: function findOne(data, options) {
        options = options || {};

        var withNext = _.contains(options.include, 'next'),
            withPrev = _.contains(options.include, 'previous'),
            nextRelations = _.transform(options.include, function (relations, include) {
                if (include === 'next.tags') {
                    relations.push('tags');
                } else if (include === 'next.author') {
                    relations.push('author');
                }
            }, []),
            prevRelations = _.transform(options.include, function (relations, include) {
            if (include === 'previous.tags') {
                relations.push('tags');
            } else if (include === 'previous.author') {
                relations.push('author');
            }
        }, []);

        data = _.defaults(data || {}, {
            status: 'published'
        });

        if (data.status === 'all') {
            delete data.status;
        }

        // Add related objects, excluding next and previous as they are not real db objects
        options.withRelated = _.union(options.withRelated, _.pull(
            [].concat(options.include),
            'next', 'next.author', 'next.tags', 'previous', 'previous.author', 'previous.tags')
        );

        return ghostBookshelf.Model.findOne.call(this, data, options).then(function then(post) {
            if ((withNext || withPrev) && post && !post.page) {
                var publishedAt = post.get('published_at'),
                    prev,
                    next;

                if (withNext) {
                    next = Post.forge().query(function queryBuilder(qb) {
                        qb.where('status', '=', 'published')
                            .andWhere('page', '=', 0)
                            .andWhere('published_at', '>', publishedAt)
                            .orderBy('published_at', 'asc')
                            .limit(1);
                    }).fetch({withRelated: nextRelations});
                }

                if (withPrev) {
                    prev = Post.forge().query(function queryBuilder(qb) {
                        qb.where('status', '=', 'published')
                            .andWhere('page', '=', 0)
                            .andWhere('published_at', '<', publishedAt)
                            .orderBy('published_at', 'desc')
                            .limit(1);
                    }).fetch({withRelated: prevRelations});
                }

                return Promise.join(next, prev)
                    .then(function then(nextAndPrev) {
                        if (nextAndPrev[0]) {
                            post.relations.next = nextAndPrev[0];
                        }
                        if (nextAndPrev[1]) {
                            post.relations.previous = nextAndPrev[1];
                        }
                        return post;
                    });
            }

            return post;
        });
    },

    /**
     * ### Edit
     * @extends ghostBookshelf.Model.edit to handle returning the full object and manage _updatedAttributes
     * **See:** [ghostBookshelf.Model.edit](base.js.html#edit)
     */
    edit: function edit(data, options) {
        var self = this;
        options = options || {};

        return ghostBookshelf.Model.edit.call(this, data, options).then(function then(post) {
            return self.findOne({status: 'all', id: options.id}, options)
                .then(function then(found) {
                    if (found) {
                        // Pass along the updated attributes for checking status changes
                        found._updatedAttributes = post._updatedAttributes;
                        return found;
                    }
                });
        });
    },

    /**
     * ### Add
     * @extends ghostBookshelf.Model.add to handle returning the full object
     * **See:** [ghostBookshelf.Model.add](base.js.html#add)
     */
    add: function add(data, options) {
        var self = this;
        options = options || {};

        return ghostBookshelf.Model.add.call(this, data, options).then(function then(post) {
            return self.findOne({status: 'all', id: post.id}, options);
        });
    },

    /**
     * ### Destroy
     * @extends ghostBookshelf.Model.destroy to clean up tag relations
     * **See:** [ghostBookshelf.Model.destroy](base.js.html#destroy)
     */
    destroy: function destroy(options) {
        var id = options.id;
        options = this.filterOptions(options, 'destroy');

        return this.forge({id: id}).fetch({withRelated: ['tags']}).then(function destroyTags(post) {
            return post.related('tags').detach().then(function destroyPosts() {
                return post.destroy(options);
            });
        });
    },

    /**
     * ### destroyByAuthor
     * @param  {[type]} options has context and id. Context is the user doing the destroy, id is the user to destroy
     */
    destroyByAuthor: function destroyByAuthor(options) {
        var postCollection = Posts.forge(),
            authorId = options.id;

        options = this.filterOptions(options, 'destroyByAuthor');
        if (authorId) {
            return postCollection.query('where', 'author_id', '=', authorId).fetch(options).then(function destroyTags(results) {
                return Promise.map(results.models, function mapper(post) {
                    return post.related('tags').detach(null, options).then(function destroyPosts() {
                        return post.destroy(options);
                    });
                });
            }, function (error) {
                return Promise.reject(new errors.InternalServerError(error.message || error));
            });
        }
        return Promise.reject(new errors.NotFoundError(i18n.t('errors.models.post.noUserFound')));
    },

    permissible: function permissible(postModelOrId, action, context, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            postModel = postModelOrId,
            origArgs;

        // If we passed in an id instead of a model, get the model
        // then check the permissions
        if (_.isNumber(postModelOrId) || _.isString(postModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);
            // Get the actual post model
            return this.findOne({id: postModelOrId, status: 'all'}).then(function then(foundPostModel) {
                // Build up the original args but substitute with actual model
                var newArgs = [foundPostModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            }, errors.logAndThrowError);
        }

        if (postModel) {
            // If this is the author of the post, allow it.
            hasUserPermission = hasUserPermission || context.user === postModel.get('author_id');
        }

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve();
        }

        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.models.post.notEnoughPermission')));
    }
});

Posts = ghostBookshelf.Collection.extend({
    model: Post
});

module.exports = {
    Post: ghostBookshelf.model('Post', Post),
    Posts: ghostBookshelf.collection('Posts', Posts)
};
