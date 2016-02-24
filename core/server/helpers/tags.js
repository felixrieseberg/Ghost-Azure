// # Tags Helper
// Usage: `{{tags}}`, `{{tags separator=' - '}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.
//
// Note that the standard {{#each tags}} implementation is unaffected by this helper

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    config          = require('../config'),
    utils           = require('./utils'),
    tags;

tags = function (options) {
    options = options || {};
    options.hash = options.hash || {};

    var autolink  = !(_.isString(options.hash.autolink) && options.hash.autolink === 'false'),
        separator = _.isString(options.hash.separator) ? options.hash.separator : ', ',
        prefix    = _.isString(options.hash.prefix) ? options.hash.prefix : '',
        suffix    = _.isString(options.hash.suffix) ? options.hash.suffix : '',
        limit     = options.hash.limit ? parseInt(options.hash.limit, 10) : undefined,
        from      = options.hash.from ? parseInt(options.hash.from, 10) : 1,
        to        = options.hash.to ? parseInt(options.hash.to, 10) : undefined,
        output = '';

    function createTagList(tags) {
        if (autolink) {
            return _.map(tags, function (tag) {
                return utils.linkTemplate({
                    url: config.urlFor('tag', {tag: tag}),
                    text: _.escape(tag.name)
                });
            });
        }
        return _(tags).pluck('name').each(_.escape);
    }

    if (this.tags && this.tags.length) {
        output = createTagList(this.tags);
        from -= 1; // From uses 1-indexed, but array uses 0-indexed.
        to = to || limit + from || this.tags.length;

        output = prefix + output.slice(from, to).join(separator) + suffix;
    }

    return new hbs.handlebars.SafeString(output);
};

module.exports = tags;
