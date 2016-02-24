var _           = require('lodash'),
    errors      = require('../../errors'),
    filters     = require('../../filters'),
    safeString  = require('../../utils/index').safeString,
    handleError        = require('./error'),
    fetchData          = require('./fetch-data'),
    formatResponse     = require('./format-response'),
    setResponseContext = require('./context'),
    setRequestIsSecure = require('./secure'),
    templates          = require('./templates');

function renderChannel(req, res, next) {
    // Parse the parameters we need from the URL
    var channelOpts = req.channelConfig,
        pageParam = req.params.page !== undefined ? req.params.page : 1,
        slugParam = req.params.slug ? safeString(req.params.slug) : undefined;

    // Ensure we at least have an empty object for postOptions
    channelOpts.postOptions = channelOpts.postOptions || {};
    // Set page on postOptions for the query made later
    channelOpts.postOptions.page = pageParam;
    channelOpts.slugParam = slugParam;

    // Call fetchData to get everything we need from the API
    return fetchData(channelOpts).then(function handleResult(result) {
        // If page is greater than number of pages we have, go straight to 404
        if (pageParam > result.meta.pagination.pages) {
            return next(new errors.NotFoundError());
        }

        // @TODO: figure out if this can be removed, it's supposed to ensure that absolutely URLs get generated
        // correctly for the various objects, but I believe it doesn't work and a different approach is needed.
        setRequestIsSecure(req, result.posts);
        _.each(result.data, function (data) {
            setRequestIsSecure(req, data);
        });

        // @TODO: properly design these filters
        filters.doFilter('prePostsRender', result.posts, res.locals).then(function then(posts) {
            var view = templates.channel(req.app.get('activeTheme'), channelOpts);

            // Do final data formatting and then render
            result.posts = posts;
            result = formatResponse.channel(result);
            setResponseContext(req, res);
            res.render(view, result);
        });
    }).catch(handleError(next));
}

module.exports = renderChannel;
