define("ghost/tests/test-helper", 
  ["ember-cli/test-loader","ember/resolver","ember-mocha"],
  function(__dependency1__, __dependency2__, __dependency3__) {
    "use strict";
    var TestLoader = __dependency1__["default"];
    var Resolver = __dependency2__["default"];
    var setResolver = __dependency3__.setResolver;

    var resolver = Resolver.create();
    resolver.namespace = {
      modulePrefix: 'ghost'
    };

    setResolver(resolver);

    TestLoader.load();

    window.expect = chai.expect;

    mocha.checkLeaks();
    mocha.globals(['jQuery', 'EmberInspector']);
    mocha.run();
  });
define("ghost/tests/unit/components/gh-trim-focus-input_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */
    var describeComponent = __dependency1__.describeComponent;
    var it = __dependency1__.it;

    describeComponent('gh-trim-focus-input', function () {
        it('trims value on focusOut', function () {
            var component = this.subject({
                value: 'some random stuff   '
            });

            this.render();

            component.$().focusout();
            expect(component.$().val()).to.equal('some random stuff');
        });

        it('does not have the autofocus attribute if not set to focus', function () {
            var component = this.subject({
                value: 'some text',
                focus: false
            });

            this.render();

            expect(component.$().attr('autofocus')).to.not.be.ok;
        });

        it('has the autofocus attribute if set to focus', function () {
            var component = this.subject({
                value: 'some text',
                focus: true
            });

            this.render();

            expect(component.$().attr('autofocus')).to.be.ok;
        });
    });
  });
define("ghost/tests/unit/components/gh-url-preview_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */
    var describeComponent = __dependency1__.describeComponent;
    var it = __dependency1__.it;

    describeComponent('gh-url-preview',
        function () {
            it('generates the correct preview URL with a prefix', function () {
                var component = this.subject({
                    prefix: 'tag',
                    slug: 'test-slug',
                    tagName: 'p',
                    classNames: 'test-class',

                    config: {blogUrl: 'http://my-ghost-blog.com'}
                });

                this.render();

                expect(component.get('url')).to.equal('my-ghost-blog.com/tag/test-slug/');
            });

            it('generates the correct preview URL without a prefix', function () {
                var component = this.subject({
                    slug: 'test-slug',
                    tagName: 'p',
                    classNames: 'test-class',

                    config: {blogUrl: 'http://my-ghost-blog.com'}
                });

                this.render();

                expect(component.get('url')).to.equal('my-ghost-blog.com/test-slug/');
            });
        }
    );
  });
define("ghost/tests/unit/controllers/post-settings-menu_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */
    var describeModule = __dependency1__.describeModule;
    var it = __dependency1__.it;

    describeModule(
        'controller:post-settings-menu',
        {
            needs: ['controller:application']
        },

        function () {
            it('slugValue is one-way bound to model.slug', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        slug: 'a-slug'
                    })
                });

                expect(controller.get('model.slug')).to.equal('a-slug');
                expect(controller.get('slugValue')).to.equal('a-slug');

                Ember.run(function () {
                    controller.set('model.slug', 'changed-slug');

                    expect(controller.get('slugValue')).to.equal('changed-slug');
                });

                Ember.run(function () {
                    controller.set('slugValue', 'changed-directly');

                    expect(controller.get('model.slug')).to.equal('changed-slug');
                    expect(controller.get('slugValue')).to.equal('changed-directly');
                });

                Ember.run(function () {
                    // test that the one-way binding is still in place
                    controller.set('model.slug', 'should-update');

                    expect(controller.get('slugValue')).to.equal('should-update');
                });
            });

            it('metaTitleScratch is one-way bound to model.meta_title', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        meta_title: 'a title'
                    })
                });

                expect(controller.get('model.meta_title')).to.equal('a title');
                expect(controller.get('metaTitleScratch')).to.equal('a title');

                Ember.run(function () {
                    controller.set('model.meta_title', 'a different title');

                    expect(controller.get('metaTitleScratch')).to.equal('a different title');
                });

                Ember.run(function () {
                    controller.set('metaTitleScratch', 'changed directly');

                    expect(controller.get('model.meta_title')).to.equal('a different title');
                    expect(controller.get('metaTitleScratch')).to.equal('changed directly');
                });

                Ember.run(function () {
                    // test that the one-way binding is still in place
                    controller.set('model.meta_title', 'should update');

                    expect(controller.get('metaTitleScratch')).to.equal('should update');
                });
            });

            it('metaDescriptionScratch is one-way bound to model.meta_description', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        meta_description: 'a description'
                    })
                });

                expect(controller.get('model.meta_description')).to.equal('a description');
                expect(controller.get('metaDescriptionScratch')).to.equal('a description');

                Ember.run(function () {
                    controller.set('model.meta_description', 'a different description');

                    expect(controller.get('metaDescriptionScratch')).to.equal('a different description');
                });

                Ember.run(function () {
                    controller.set('metaDescriptionScratch', 'changed directly');

                    expect(controller.get('model.meta_description')).to.equal('a different description');
                    expect(controller.get('metaDescriptionScratch')).to.equal('changed directly');
                });

                Ember.run(function () {
                    // test that the one-way binding is still in place
                    controller.set('model.meta_description', 'should update');

                    expect(controller.get('metaDescriptionScratch')).to.equal('should update');
                });
            });

            describe('seoTitle', function () {
                it('should be the meta_title if one exists', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            meta_title: 'a meta-title',
                            titleScratch: 'should not be used'
                        })
                    });

                    expect(controller.get('seoTitle')).to.equal('a meta-title');
                });

                it('should default to the title if an explicit meta-title does not exist', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            titleScratch: 'should be the meta-title'
                        })
                    });

                    expect(controller.get('seoTitle')).to.equal('should be the meta-title');
                });

                it('should be the meta_title if both title and meta_title exist', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            meta_title: 'a meta-title',
                            titleScratch: 'a title'
                        })
                    });

                    expect(controller.get('seoTitle')).to.equal('a meta-title');
                });

                it('should revert to the title if explicit meta_title is removed', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            meta_title: 'a meta-title',
                            titleScratch: 'a title'
                        })
                    });

                    expect(controller.get('seoTitle')).to.equal('a meta-title');

                    Ember.run(function () {
                        controller.set('model.meta_title', '');

                        expect(controller.get('seoTitle')).to.equal('a title');
                    });
                });

                it('should truncate to 70 characters with an appended ellipsis', function () {
                    var longTitle,
                        controller;

                    longTitle = new Array(100).join('a');
                    expect(longTitle.length).to.equal(99);

                    controller = this.subject({
                        model: Ember.Object.create()
                    });

                    Ember.run(function () {
                        var expected = longTitle.substr(0, 70) + '&hellip;';

                        controller.set('metaTitleScratch', longTitle);

                        expect(controller.get('seoTitle').toString().length).to.equal(78);
                        expect(controller.get('seoTitle').toString()).to.equal(expected);
                    });
                });
            });

            describe('seoDescription', function () {
                it('should be the meta_description if one exists', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            meta_description: 'a description'
                        })
                    });

                    expect(controller.get('seoDescription')).to.equal('a description');
                });

                it.skip('should be generated from the rendered markdown if not explicitly set', function () {
                    // can't test right now because the rendered markdown is being pulled
                    // from the DOM via jquery
                });

                it('should truncate to 156 characters with an appended ellipsis', function () {
                    var longDescription,
                        controller;

                    longDescription = new Array(200).join('a');
                    expect(longDescription.length).to.equal(199);

                    controller = this.subject({
                        model: Ember.Object.create()
                    });

                    Ember.run(function () {
                        var expected = longDescription.substr(0, 156) + '&hellip;';

                        controller.set('metaDescriptionScratch', longDescription);

                        expect(controller.get('seoDescription').toString().length).to.equal(164);
                        expect(controller.get('seoDescription').toString()).to.equal(expected);
                    });
                });
            });

            describe('seoURL', function () {
                it('should be the URL of the blog if no post slug exists', function () {
                    var controller = this.subject({
                        config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                        model: Ember.Object.create()
                    });

                    expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/');
                });

                it('should be the URL of the blog plus the post slug', function () {
                    var controller = this.subject({
                        config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                        model: Ember.Object.create({slug: 'post-slug'})
                    });

                    expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
                });

                it('should update when the post slug changes', function () {
                    var controller = this.subject({
                        config: Ember.Object.create({blogUrl: 'http://my-ghost-blog.com'}),
                        model: Ember.Object.create({slug: 'post-slug'})
                    });

                    expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');

                    Ember.run(function () {
                        controller.set('model.slug', 'changed-slug');

                        expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/changed-slug/');
                    });
                });

                it('should truncate a long URL to 70 characters with an appended ellipsis', function () {
                    var longSlug,
                        blogURL = 'http://my-ghost-blog.com',
                        expected,
                        controller;

                    longSlug = new Array(75).join('a');
                    expect(longSlug.length).to.equal(74);

                    controller = this.subject({
                        config: Ember.Object.create({blogUrl: blogURL}),
                        model: Ember.Object.create({slug: longSlug})
                    });

                    expected = blogURL + '/' + longSlug + '/';
                    expected = expected.substr(0, 70) + '&hellip;';

                    expect(controller.get('seoURL').toString().length).to.equal(78);
                    expect(controller.get('seoURL').toString()).to.equal(expected);
                });
            });

            describe('togglePage', function () {
                it('should toggle the page property', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            page: false,
                            isNew: true
                        })
                    });

                    expect(controller.get('model.page')).to.not.be.ok;

                    Ember.run(function () {
                        controller.send('togglePage');

                        expect(controller.get('model.page')).to.be.ok;
                    });
                });

                it('should not save the post if it is still new', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            page: false,
                            isNew: true,
                            save: function () {
                                this.incrementProperty('saved');
                                return Ember.RSVP.resolve();
                            }
                        })
                    });

                    Ember.run(function () {
                        controller.send('togglePage');

                        expect(controller.get('model.page')).to.be.ok;
                        expect(controller.get('model.saved')).to.not.be.ok;
                    });
                });

                it('should save the post if it is not new', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            page: false,
                            isNew: false,
                            save: function () {
                                this.incrementProperty('saved');
                                return Ember.RSVP.resolve();
                            }
                        })
                    });

                    Ember.run(function () {
                        controller.send('togglePage');

                        expect(controller.get('model.page')).to.be.ok;
                        expect(controller.get('model.saved')).to.equal(1);
                    });
                });
            });

            describe('toggleFeatured', function () {
                it('should toggle the featured property', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            featured: false,
                            isNew: true
                        })
                    });

                    Ember.run(function () {
                        controller.send('toggleFeatured');

                        expect(controller.get('model.featured')).to.be.ok;
                    });
                });

                it('should not save the post if it is still new', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            featured: false,
                            isNew: true,
                            save: function () {
                                this.incrementProperty('saved');
                                return Ember.RSVP.resolve();
                            }
                        })
                    });

                    Ember.run(function () {
                        controller.send('toggleFeatured');

                        expect(controller.get('model.featured')).to.be.ok;
                        expect(controller.get('model.saved')).to.not.be.ok;
                    });
                });

                it('should save the post if it is not new', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            featured: false,
                            isNew: false,
                            save: function () {
                                this.incrementProperty('saved');
                                return Ember.RSVP.resolve();
                            }
                        })
                    });

                    Ember.run(function () {
                        controller.send('toggleFeatured');

                        expect(controller.get('model.featured')).to.be.ok;
                        expect(controller.get('model.saved')).to.equal(1);
                    });
                });
            });

            describe('generateAndSetSlug', function () {
                it('should generate a slug and set it on the destination', function (done) {
                    var controller = this.subject({
                        slugGenerator: Ember.Object.create({
                            generateSlug: function (str) {
                                return Ember.RSVP.resolve(str + '-slug');
                            }
                        }),
                        model: Ember.Object.create({slug: ''})
                    });

                    Ember.run(function () {
                        controller.set('model.titleScratch', 'title');
                        controller.generateAndSetSlug('model.slug');

                        expect(controller.get('model.slug')).to.equal('');

                        Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                            expect(controller.get('model.slug')).to.equal('title-slug');

                            done();
                        }).catch(done);
                    });
                });

                it('should not set the destination if the title is "(Untitled)" and the post already has a slug', function (done) {
                    var controller = this.subject({
                        slugGenerator: Ember.Object.create({
                            generateSlug: function (str) {
                                return Ember.RSVP.resolve(str + '-slug');
                            }
                        }),
                        model: Ember.Object.create({
                            slug: 'whatever'
                        })
                    });

                    expect(controller.get('model.slug')).to.equal('whatever');

                    Ember.run(function () {
                        controller.set('model.titleScratch', 'title');

                        Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                            expect(controller.get('model.slug')).to.equal('whatever');

                            done();
                        }).catch(done);
                    });
                });
            });

            describe('titleObserver', function () {
                it('should invoke generateAndSetSlug if the post is new and a title has not been set', function (done) {
                    var controller = this.subject({
                        model: Ember.Object.create({isNew: true}),
                        invoked: 0,
                        generateAndSetSlug: function () {
                            this.incrementProperty('invoked');
                        }
                    });

                    expect(controller.get('invoked')).to.equal(0);
                    expect(controller.get('model.title')).to.not.be.ok;

                    Ember.run(function () {
                        controller.set('model.titleScratch', 'test');

                        controller.titleObserver();

                        // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                        // we need to make sure this assertion runs after that.
                        // probably a better way to handle this?
                        Ember.run.later(function () {
                            expect(controller.get('invoked')).to.equal(1);

                            done();
                        }, 800);
                    });
                });

                it('should invoke generateAndSetSlug if the post title is "(Untitled)"', function (done) {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            isNew: false,
                            title: '(Untitled)'
                        }),
                        invoked: 0,
                        generateAndSetSlug: function () {
                            this.incrementProperty('invoked');
                        }
                    });

                    expect(controller.get('invoked')).to.equal(0);
                    expect(controller.get('model.title')).to.equal('(Untitled)');

                    Ember.run(function () {
                        controller.set('model.titleScratch', 'test');

                        controller.titleObserver();

                        // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                        // we need to make sure this assertion runs after that.
                        // probably a better way to handle this?
                        Ember.run.later(function () {
                            expect(controller.get('invoked')).to.equal(1);

                            done();
                        }, 800);
                    });
                });

                it('should not invoke generateAndSetSlug if the post is new but has a title', function (done) {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            isNew: true,
                            title: 'a title'
                        }),
                        invoked: 0,
                        generateAndSetSlug: function () {
                            this.incrementProperty('invoked');
                        }
                    });

                    expect(controller.get('invoked')).to.equal(0);
                    expect(controller.get('model.title')).to.equal('a title');

                    Ember.run(function () {
                        controller.set('model.titleScratch', 'test');

                        controller.titleObserver();

                        // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                        // we need to make sure this assertion runs after that.
                        // probably a better way to handle this?
                        Ember.run.later(function () {
                            expect(controller.get('invoked')).to.equal(0);

                            done();
                        }, 800);
                    });
                });
            });

            describe('updateSlug', function () {
                it('should reset slugValue to the previous slug when the new slug is blank or unchanged', function () {
                    var controller = this.subject({
                        model: Ember.Object.create({
                            slug: 'slug'
                        })
                    });

                    Ember.run(function () {
                        // unchanged
                        controller.set('slugValue', 'slug');
                        controller.send('updateSlug', controller.get('slugValue'));

                        expect(controller.get('model.slug')).to.equal('slug');
                        expect(controller.get('slugValue')).to.equal('slug');
                    });

                    Ember.run(function () {
                        // unchanged after trim
                        controller.set('slugValue', 'slug  ');
                        controller.send('updateSlug', controller.get('slugValue'));

                        expect(controller.get('model.slug')).to.equal('slug');
                        expect(controller.get('slugValue')).to.equal('slug');
                    });

                    Ember.run(function () {
                        // blank
                        controller.set('slugValue', '');
                        controller.send('updateSlug', controller.get('slugValue'));

                        expect(controller.get('model.slug')).to.equal('slug');
                        expect(controller.get('slugValue')).to.equal('slug');
                    });
                });

                it('should not set a new slug if the server-generated slug matches existing slug', function (done) {
                    var controller = this.subject({
                        slugGenerator: Ember.Object.create({
                            generateSlug: function (str) {
                                var promise;
                                promise = Ember.RSVP.resolve(str.split('#')[0]);
                                this.set('lastPromise', promise);
                                return promise;
                            }
                        }),
                        model: Ember.Object.create({
                            slug: 'whatever'
                        })
                    });

                    Ember.run(function () {
                        controller.set('slugValue', 'whatever#slug');
                        controller.send('updateSlug', controller.get('slugValue'));

                        Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                            expect(controller.get('model.slug')).to.equal('whatever');

                            done();
                        }).catch(done);
                    });
                });

                it('should not set a new slug if the only change is to the appended increment value', function (done) {
                    var controller = this.subject({
                        slugGenerator: Ember.Object.create({
                            generateSlug: function (str) {
                                var promise;
                                promise = Ember.RSVP.resolve(str.replace(/[^a-zA-Z]/g, '') + '-2');
                                this.set('lastPromise', promise);
                                return promise;
                            }
                        }),
                        model: Ember.Object.create({
                            slug: 'whatever'
                        })
                    });

                    Ember.run(function () {
                        controller.set('slugValue', 'whatever!');
                        controller.send('updateSlug', controller.get('slugValue'));

                        Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                            expect(controller.get('model.slug')).to.equal('whatever');

                            done();
                        }).catch(done);
                    });
                });

                it('should set the slug if the new slug is different', function (done) {
                    var controller = this.subject({
                        slugGenerator: Ember.Object.create({
                            generateSlug: function (str) {
                                var promise;
                                promise = Ember.RSVP.resolve(str);
                                this.set('lastPromise', promise);
                                return promise;
                            }
                        }),
                        model: Ember.Object.create({
                            slug: 'whatever',
                            save: Ember.K
                        })
                    });

                    Ember.run(function () {
                        controller.set('slugValue', 'changed');
                        controller.send('updateSlug', controller.get('slugValue'));

                        Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                            expect(controller.get('model.slug')).to.equal('changed');

                            done();
                        }).catch(done);
                    });
                });

                it('should save the post when the slug changes and the post is not new', function (done) {
                    var controller = this.subject({
                        slugGenerator: Ember.Object.create({
                            generateSlug: function (str) {
                                var promise;
                                promise = Ember.RSVP.resolve(str);
                                this.set('lastPromise', promise);
                                return promise;
                            }
                        }),
                        model: Ember.Object.create({
                            slug: 'whatever',
                            saved: 0,
                            isNew: false,
                            save: function () {
                                this.incrementProperty('saved');
                            }
                        })
                    });

                    Ember.run(function () {
                        controller.set('slugValue', 'changed');
                        controller.send('updateSlug', controller.get('slugValue'));

                        Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                            expect(controller.get('model.slug')).to.equal('changed');
                            expect(controller.get('model.saved')).to.equal(1);

                            done();
                        }).catch(done);
                    });
                });

                it('should not save the post when the slug changes and the post is new', function (done) {
                    var controller = this.subject({
                        slugGenerator: Ember.Object.create({
                            generateSlug: function (str) {
                                var promise;
                                promise = Ember.RSVP.resolve(str);
                                this.set('lastPromise', promise);
                                return promise;
                            }
                        }),
                        model: Ember.Object.create({
                            slug: 'whatever',
                            saved: 0,
                            isNew: true,
                            save: function () {
                                this.incrementProperty('saved');
                            }
                        })
                    });

                    Ember.run(function () {
                        controller.set('slugValue', 'changed');
                        controller.send('updateSlug', controller.get('slugValue'));

                        Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                            expect(controller.get('model.slug')).to.equal('changed');
                            expect(controller.get('model.saved')).to.equal(0);

                            done();
                        }).catch(done);
                    });
                });
            });
        }
    );
  });
define("ghost/tests/unit/controllers/settings-general_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */
    var describeModule = __dependency1__.describeModule;
    var it = __dependency1__.it;

    describeModule(
        'controller:settings/general',

        function () {
            it('isDatedPermalinks should be correct', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        permalinks: '/:year/:month/:day/:slug/'
                    })
                });

                expect(controller.get('isDatedPermalinks')).to.be.ok;

                Ember.run(function () {
                    controller.set('model.permalinks', '/:slug/');

                    expect(controller.get('isDatedPermalinks')).to.not.be.ok;
                });
            });

            it('setting isDatedPermalinks should switch between dated and slug', function () {
                var controller = this.subject({
                    model: Ember.Object.create({
                        permalinks: '/:year/:month/:day/:slug/'
                    })
                });

                Ember.run(function () {
                    controller.set('isDatedPermalinks', false);

                    expect(controller.get('isDatedPermalinks')).to.not.be.ok;
                    expect(controller.get('model.permalinks')).to.equal('/:slug/');
                });

                Ember.run(function () {
                    controller.set('isDatedPermalinks', true);

                    expect(controller.get('isDatedPermalinks')).to.be.ok;
                    expect(controller.get('model.permalinks')).to.equal('/:year/:month/:day/:slug/');
                });
            });

            it('themes should be correct', function () {
                var controller,
                    themes = [];

                themes.push({
                    name: 'casper',
                    active: true,
                    package: {
                        name: 'Casper',
                        version: '1.1.5'
                    }
                });

                themes.push({
                    name: 'rasper',
                    package: {
                        name: 'Rasper',
                        version: '1.0.0'
                    }
                });

                controller = this.subject({
                    model: Ember.Object.create({
                        availableThemes: themes
                    })
                });

                themes = controller.get('themes');
                expect(themes).to.be.an.Array;
                expect(themes.length).to.equal(2);
                expect(themes.objectAt(0).name).to.equal('casper');
                expect(themes.objectAt(0).active).to.be.ok;
                expect(themes.objectAt(0).label).to.equal('Casper - 1.1.5');
                expect(themes.objectAt(1).name).to.equal('rasper');
                expect(themes.objectAt(1).active).to.not.be.ok;
                expect(themes.objectAt(1).label).to.equal('Rasper - 1.0.0');
            });
        }
    );
  });
define("ghost/tests/unit/models/post_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */
    var describeModel = __dependency1__.describeModel;
    var it = __dependency1__.it;

    describeModel('post',
        {
            needs:['model:user', 'model:tag', 'model:role']
        },

        function () {
            it('has a validation type of "post"', function () {
                var model = this.subject();

                expect(model.validationType).to.equal('post');
            });

            it('isPublished and isDraft are correct', function () {
                var model = this.subject({
                    status: 'published'
                });

                expect(model.get('isPublished')).to.be.ok;
                expect(model.get('isDraft')).to.not.be.ok;

                Ember.run(function () {
                    model.set('status', 'draft');

                    expect(model.get('isPublished')).to.not.be.ok;
                    expect(model.get('isDraft')).to.be.ok;
                });
            });

            it('isAuthoredByUser is correct', function () {
                var model = this.subject({
                    author_id: 15
                }),
                user = Ember.Object.create({id: '15'});

                expect(model.isAuthoredByUser(user)).to.be.ok;

                Ember.run(function () {
                    model.set('author_id', 1);

                    expect(model.isAuthoredByUser(user)).to.not.be.ok;
                });
            });

            it('updateTags removes and deletes old tags', function () {
                var model = this.subject();

                Ember.run(this, function () {
                    var modelTags = model.get('tags'),
                        tag1 = this.store().createRecord('tag', {id: '1'}),
                        tag2 = this.store().createRecord('tag', {id: '2'}),
                        tag3 = this.store().createRecord('tag');

                    // During testing a record created without an explicit id will get
                    // an id of 'fixture-n' instead of null
                    tag3.set('id', null);

                    modelTags.pushObject(tag1);
                    modelTags.pushObject(tag2);
                    modelTags.pushObject(tag3);

                    expect(model.get('tags.length')).to.equal(3);

                    model.updateTags();

                    expect(model.get('tags.length')).to.equal(2);
                    expect(model.get('tags.firstObject.id')).to.equal('1');
                    expect(model.get('tags').objectAt(1).get('id')).to.equal('2');
                    expect(tag1.get('isDeleted')).to.not.be.ok;
                    expect(tag2.get('isDeleted')).to.not.be.ok;
                    expect(tag3.get('isDeleted')).to.be.ok;
                });
            });
        }
    );
  });
define("ghost/tests/unit/models/role_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    var describeModel = __dependency1__.describeModel;
    var it = __dependency1__.it;

    describeModel('role', function () {
        it('provides a lowercase version of the name', function () {
            var model = this.subject({
                name: 'Author'
            });

            expect(model.get('name')).to.equal('Author');
            expect(model.get('lowerCaseName')).to.equal('author');

            Ember.run(function () {
                model.set('name', 'Editor');

                expect(model.get('name')).to.equal('Editor');
                expect(model.get('lowerCaseName')).to.equal('editor');
            });
        });
    });
  });
define("ghost/tests/unit/models/setting_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    var describeModel = __dependency1__.describeModel;
    var it = __dependency1__.it;

    describeModel('setting', function () {
        it('has a validation type of "setting"', function () {
            var model = this.subject();

            expect(model.get('validationType')).to.equal('setting');
        });
    });
  });
define("ghost/tests/unit/models/tag_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    var describeModel = __dependency1__.describeModel;
    var it = __dependency1__.it;

    describeModel('tag', function () {
        it('has a validation type of "tag"', function () {
            var model = this.subject();

            expect(model.get('validationType')).to.equal('tag');
        });
    });
  });
define("ghost/tests/unit/models/user_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    /*jshint expr:true */
    var describeModel = __dependency1__.describeModel;
    var it = __dependency1__.it;

    describeModel('user',
        {
            needs: ['model:role']
        },

        function () {
            it('has a validation type of "user"', function () {
                var model = this.subject();

                expect(model.get('validationType')).to.equal('user');
            });

            it('active property is correct', function () {
                var model = this.subject({
                    status: 'active'
                });

                expect(model.get('active')).to.be.ok;

                ['warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].forEach(function (status) {
                    Ember.run(function () {
                        model.set('status', status);

                        expect(model.get('status')).to.be.ok;
                    });
                });

                Ember.run(function () {
                    model.set('status', 'inactive');

                    expect(model.get('active')).to.not.be.ok;
                });

                Ember.run(function () {
                    model.set('status', 'invited');

                    expect(model.get('active')).to.not.be.ok;
                });
            });

            it('invited property is correct', function () {
                var model = this.subject({
                    status: 'invited'
                });

                expect(model.get('invited')).to.be.ok;

                Ember.run(function () {
                    model.set('status', 'invited-pending');

                    expect(model.get('invited')).to.be.ok;
                });

                Ember.run(function () {
                    model.set('status', 'active');

                    expect(model.get('invited')).to.not.be.ok;
                });

                Ember.run(function () {
                    model.set('status', 'inactive');

                    expect(model.get('invited')).to.not.be.ok;
                });
            });

            it('pending property is correct', function () {
                var model = this.subject({
                    status: 'invited-pending'
                });

                expect(model.get('pending')).to.be.ok;

                Ember.run(function () {
                    model.set('status', 'invited');

                    expect(model.get('pending')).to.not.be.ok;
                });

                Ember.run(function () {
                    model.set('status', 'inactive');

                    expect(model.get('pending')).to.not.be.ok;
                });
            });

            it('role property is correct', function () {
                var model,
                    role;

                model = this.subject();

                Ember.run(this, function () {
                    role = this.store().createRecord('role', {name: 'Author'});

                    model.get('roles').pushObject(role);

                    expect(model.get('role.name')).to.equal('Author');
                });

                Ember.run(this, function () {
                    role = this.store().createRecord('role', {name: 'Editor'});

                    model.set('role', role);

                    expect(model.get('role.name')).to.equal('Editor');
                });
            });

            it('isAuthor property is correct', function () {
                var model = this.subject();

                Ember.run(this, function () {
                    var role = this.store().createRecord('role', {name: 'Author'});

                    model.set('role', role);

                    expect(model.get('isAuthor')).to.be.ok;
                    expect(model.get('isEditor')).to.not.be.ok;
                    expect(model.get('isAdmin')).to.not.be.ok;
                    expect(model.get('isOwner')).to.not.be.ok;
                });
            });

            it('isEditor property is correct', function () {
                var model = this.subject();

                Ember.run(this, function () {
                    var role = this.store().createRecord('role', {name: 'Editor'});

                    model.set('role', role);

                    expect(model.get('isEditor')).to.be.ok;
                    expect(model.get('isAuthor')).to.not.be.ok;
                    expect(model.get('isAdmin')).to.not.be.ok;
                    expect(model.get('isOwner')).to.not.be.ok;
                });
            });

            it('isAdmin property is correct', function () {
                var model = this.subject();

                Ember.run(this, function () {
                    var role = this.store().createRecord('role', {name: 'Administrator'});

                    model.set('role', role);

                    expect(model.get('isAdmin')).to.be.ok;
                    expect(model.get('isAuthor')).to.not.be.ok;
                    expect(model.get('isEditor')).to.not.be.ok;
                    expect(model.get('isOwner')).to.not.be.ok;
                });
            });

            it('isOwner property is correct', function () {
                var model = this.subject();

                Ember.run(this, function () {
                    var role = this.store().createRecord('role', {name: 'Owner'});

                    model.set('role', role);

                    expect(model.get('isOwner')).to.be.ok;
                    expect(model.get('isAuthor')).to.not.be.ok;
                    expect(model.get('isAdmin')).to.not.be.ok;
                    expect(model.get('isEditor')).to.not.be.ok;
                });
            });
        }
    );
  });
define("ghost/tests/unit/utils/ghost-paths_test", 
  ["ghost/utils/ghost-paths"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */

    var ghostPaths = __dependency1__["default"];

    describe('ghost-paths', function () {
        describe('join', function () {
            var join = ghostPaths().url.join;

            it('should join two or more paths, normalizing slashes', function () {
                var path;

                path = join('/one/', '/two/');
                expect(path).to.equal('/one/two/');

                path = join('/one', '/two/');
                expect(path).to.equal('/one/two/');

                path = join('/one/', 'two/');
                expect(path).to.equal('/one/two/');

                path = join('/one/', 'two/', '/three/');
                expect(path).to.equal('/one/two/three/');

                path = join('/one/', 'two', 'three/');
                expect(path).to.equal('/one/two/three/');
            });

            it('should not change the slash at the beginning', function () {
                var path;

                path = join('one/');
                expect(path).to.equal('one/');
                path = join('one/', 'two');
                expect(path).to.equal('one/two/');
                path = join('/one/', 'two');
                expect(path).to.equal('/one/two/');
                path = join('one/', 'two', 'three');
                expect(path).to.equal('one/two/three/');
                path = join('/one/', 'two', 'three');
                expect(path).to.equal('/one/two/three/');
            });

            it('should always return a slash at the end', function () {
                var path;

                path = join();
                expect(path).to.equal('/');
                path = join('');
                expect(path).to.equal('/');
                path = join('one');
                expect(path).to.equal('one/');
                path = join('one/');
                expect(path).to.equal('one/');
                path = join('one', 'two');
                expect(path).to.equal('one/two/');
                path = join('one', 'two/');
                expect(path).to.equal('one/two/');
            });
        });
    });
  });
//# sourceMappingURL=ghost-tests.js.map