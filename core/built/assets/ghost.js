/* jshint ignore:start */

/* jshint ignore:end */

define('ghost/adapters/application', ['exports', 'ghost/adapters/embedded-relation-adapter'], function (exports, EmbeddedRelationAdapter) {

	'use strict';

	var ApplicationAdapter = EmbeddedRelationAdapter['default'].extend();

	exports['default'] = ApplicationAdapter;

});
define('ghost/adapters/base', ['exports', 'ember-data', 'ghost/utils/ghost-paths'], function (exports, DS, ghostPaths) {

    'use strict';

    var BaseAdapter = DS['default'].RESTAdapter.extend({
        host: window.location.origin,
        namespace: ghostPaths['default']().apiRoot.slice(1),

        findQuery: function findQuery(store, type, query) {
            var id;

            if (query.id) {
                id = query.id;
                delete query.id;
            }

            return this.ajax(this.buildURL(type.typeKey, id), "GET", { data: query });
        },

        buildURL: function buildURL(type, id) {
            // Ensure trailing slashes
            var url = this._super(type, id);

            if (url.slice(-1) !== "/") {
                url += "/";
            }

            return url;
        },

        // Override deleteRecord to disregard the response body on 2xx responses.
        // This is currently needed because the API is returning status 200 along
        // with the JSON object for the deleted entity and Ember expects an empty
        // response body for successful DELETEs.
        // Non-2xx (failure) responses will still work correctly as Ember will turn
        // them into rejected promises.
        deleteRecord: function deleteRecord() {
            var response = this._super.apply(this, arguments);

            return response.then(function () {
                return null;
            });
        }
    });

    exports['default'] = BaseAdapter;

});
define('ghost/adapters/embedded-relation-adapter', ['exports', 'ember', 'ghost/adapters/base'], function (exports, Ember, BaseAdapter) {

    'use strict';

    var EmbeddedRelationAdapter = BaseAdapter['default'].extend({
        find: function find(store, type, id) {
            return this.ajax(this.buildIncludeURL(store, type, id), "GET");
        },

        findQuery: function findQuery(store, type, query) {
            return this._super(store, type, this.buildQuery(store, type, query));
        },

        findAll: function findAll(store, type, sinceToken) {
            var query = {};

            if (sinceToken) {
                query.since = sinceToken;
            }

            return this.findQuery(store, type, query);
        },

        createRecord: function createRecord(store, type, record) {
            return this.saveRecord(store, type, record, { method: "POST" });
        },

        updateRecord: function updateRecord(store, type, record) {
            var options = {
                method: "PUT",
                id: Ember['default'].get(record, "id")
            };

            return this.saveRecord(store, type, record, options);
        },

        saveRecord: function saveRecord(store, type, record, options) {
            options = options || {};

            var url = this.buildIncludeURL(store, type, options.id),
                payload = this.preparePayload(store, type, record);

            return this.ajax(url, options.method, payload);
        },

        preparePayload: function preparePayload(store, type, record) {
            var serializer = store.serializerFor(type.typeKey),
                payload = {};

            serializer.serializeIntoHash(payload, type, record);

            return { data: payload };
        },

        buildIncludeURL: function buildIncludeURL(store, type, id) {
            var url = this.buildURL(type.typeKey, id),
                includes = this.getEmbeddedRelations(store, type);

            if (includes.length) {
                url += "?include=" + includes.join(",");
            }

            return url;
        },

        buildQuery: function buildQuery(store, type, options) {
            var toInclude = this.getEmbeddedRelations(store, type),
                query = options || {},
                deDupe = {};

            if (toInclude.length) {
                // If this is a find by id, build a query object and attach the includes
                if (typeof options === "string" || typeof options === "number") {
                    query = {};
                    query.id = options;
                    query.include = toInclude.join(",");
                } else if (typeof options === "object" || Ember['default'].isNone(options)) {
                    // If this is a find all (no existing query object) build one and attach
                    // the includes.
                    // If this is a find with an existing query object then merge the includes
                    // into the existing object. Existing properties and includes are preserved.
                    query = query || {};
                    toInclude = toInclude.concat(query.include ? query.include.split(",") : []);

                    toInclude.forEach(function (include) {
                        deDupe[include] = true;
                    });

                    query.include = Object.keys(deDupe).join(",");
                }
            }

            return query;
        },

        getEmbeddedRelations: function getEmbeddedRelations(store, type) {
            var model = store.modelFor(type),
                ret = [];

            // Iterate through the model's relationships and build a list
            // of those that need to be pulled in via "include" from the API
            model.eachRelationship(function (name, meta) {
                if (meta.kind === "hasMany" && Object.prototype.hasOwnProperty.call(meta.options, "embedded") && meta.options.embedded === "always") {
                    ret.push(name);
                }
            });

            return ret;
        }
    });

    exports['default'] = EmbeddedRelationAdapter;

});
define('ghost/adapters/setting', ['exports', 'ghost/adapters/application'], function (exports, ApplicationAdapter) {

    'use strict';

    var SettingAdapter = ApplicationAdapter['default'].extend({
        updateRecord: function updateRecord(store, type, record) {
            var data = {},
                serializer = store.serializerFor(type.typeKey);

            // remove the fake id that we added onto the model.
            delete record.id;

            // use the SettingSerializer to transform the model back into
            // an array of settings objects like the API expects
            serializer.serializeIntoHash(data, type, record);

            // use the ApplicationAdapter's buildURL method but do not
            // pass in an id.
            return this.ajax(this.buildURL(type.typeKey), "PUT", { data: data });
        }
    });

    exports['default'] = SettingAdapter;

});
define('ghost/adapters/user', ['exports', 'ghost/adapters/application'], function (exports, ApplicationAdapter) {

    'use strict';

    var UserAdapter = ApplicationAdapter['default'].extend({
        find: function find(store, type, id) {
            return this.findQuery(store, type, { id: id, status: "all" });
        }
    });

    exports['default'] = UserAdapter;

});
define('ghost/app', ['exports', 'ember', 'ember/resolver', 'ember/load-initializers', 'ghost/utils/link-view', 'ghost/utils/text-field', 'ghost/config/environment'], function (exports, Ember, Resolver, loadInitializers, __dep3__, __dep4__, config) {

    'use strict';

    Ember['default'].MODEL_FACTORY_INJECTIONS = true;

    var App = Ember['default'].Application.extend({
        modulePrefix: config['default'].modulePrefix,
        podModulePrefix: config['default'].podModulePrefix,
        Resolver: Resolver['default']
    });

    loadInitializers['default'](App, config['default'].modulePrefix);

    exports['default'] = App;

});
define('ghost/assets/lib/uploader', ['exports', 'ghost/utils/ghost-paths'], function (exports, ghostPaths) {

    'use strict';

    var UploadUi,
        upload,
        Ghost = ghostPaths['default']();

    UploadUi = function ($dropzone, settings) {
        var $url = "<div class=\"js-url\"><input class=\"url js-upload-url\" type=\"url\" placeholder=\"http://\"/></div>",
            $cancel = "<a class=\"image-cancel js-cancel\" title=\"Delete\"><span class=\"hidden\">Delete</span></a>",
            $progress = $("<div />", {
            "class": "js-upload-progress progress progress-success active",
            role: "progressbar",
            "aria-valuemin": "0",
            "aria-valuemax": "100"
        }).append($("<div />", {
            "class": "js-upload-progress-bar bar",
            style: "width:0%"
        }));

        $.extend(this, {
            complete: function complete(result) {
                var self = this;

                function showImage(width, height) {
                    $dropzone.find("img.js-upload-target").attr({ width: width, height: height }).css({ display: "block" });
                    $dropzone.find(".fileupload-loading").remove();
                    $dropzone.css({ height: "auto" });
                    $dropzone.delay(250).animate({ opacity: 100 }, 1000, function () {
                        $(".js-button-accept").prop("disabled", false);
                        self.init();
                    });
                }

                function animateDropzone($img) {
                    $dropzone.animate({ opacity: 0 }, 250, function () {
                        $dropzone.removeClass("image-uploader").addClass("pre-image-uploader");
                        $dropzone.css({ minHeight: 0 });
                        self.removeExtras();
                        $dropzone.animate({ height: $img.height() }, 250, function () {
                            showImage($img.width(), $img.height());
                        });
                    });
                }

                function preLoadImage() {
                    var $img = $dropzone.find("img.js-upload-target").attr({ src: "", width: "auto", height: "auto" });

                    $progress.animate({ opacity: 0 }, 250, function () {
                        $dropzone.find("span.media").after("<img class=\"fileupload-loading\"  src=\"" + Ghost.subdir + "/ghost/img/loadingcat.gif\" />");
                        if (!settings.editor) {
                            $progress.find(".fileupload-loading").css({ top: "56px" });
                        }
                    });
                    $dropzone.trigger("uploadsuccess", [result]);
                    $img.one("load", function () {
                        animateDropzone($img);
                    }).attr("src", result);
                }
                preLoadImage();
            },

            bindFileUpload: function bindFileUpload() {
                var self = this;

                $dropzone.find(".js-fileupload").fileupload().fileupload("option", {
                    url: Ghost.apiRoot + "/uploads/",
                    add: function add(e, data) {
                        /*jshint unused:false*/
                        $(".js-button-accept").prop("disabled", true);
                        $dropzone.find(".js-fileupload").removeClass("right");
                        $dropzone.find(".js-url").remove();
                        $progress.find(".js-upload-progress-bar").removeClass("fail");
                        $dropzone.trigger("uploadstart", [$dropzone.attr("id")]);
                        $dropzone.find("span.media, div.description, a.image-url, a.image-webcam").animate({ opacity: 0 }, 250, function () {
                            $dropzone.find("div.description").hide().css({ opacity: 100 });
                            if (settings.progressbar) {
                                $dropzone.find("div.js-fail").after($progress);
                                $progress.animate({ opacity: 100 }, 250);
                            }
                            data.submit();
                        });
                    },
                    dropZone: settings.fileStorage ? $dropzone : null,
                    progressall: function progressall(e, data) {
                        /*jshint unused:false*/
                        var progress = parseInt(data.loaded / data.total * 100, 10);
                        if (!settings.editor) {
                            $progress.find("div.js-progress").css({ position: "absolute", top: "40px" });
                        }
                        if (settings.progressbar) {
                            $dropzone.trigger("uploadprogress", [progress, data]);
                            $progress.find(".js-upload-progress-bar").css("width", progress + "%");
                        }
                    },
                    fail: function fail(e, data) {
                        /*jshint unused:false*/
                        $(".js-button-accept").prop("disabled", false);
                        $dropzone.trigger("uploadfailure", [data.result]);
                        $dropzone.find(".js-upload-progress-bar").addClass("fail");
                        if (data.jqXHR.status === 413) {
                            $dropzone.find("div.js-fail").text("The image you uploaded was larger than the maximum file size your server allows.");
                        } else if (data.jqXHR.status === 415) {
                            $dropzone.find("div.js-fail").text("The image type you uploaded is not supported. Please use .PNG, .JPG, .GIF, .SVG.");
                        } else {
                            $dropzone.find("div.js-fail").text("Something went wrong :(");
                        }
                        $dropzone.find("div.js-fail, button.js-fail").fadeIn(1500);
                        $dropzone.find("button.js-fail").on("click", function () {
                            $dropzone.css({ minHeight: 0 });
                            $dropzone.find("div.description").show();
                            self.removeExtras();
                            self.init();
                        });
                    },
                    done: function done(e, data) {
                        /*jshint unused:false*/
                        self.complete(data.result);
                    }
                });
            },

            buildExtras: function buildExtras() {
                if (!$dropzone.find("span.media")[0]) {
                    $dropzone.prepend("<span class=\"media\"><span class=\"hidden\">Image Upload</span></span>");
                }
                if (!$dropzone.find("div.description")[0]) {
                    $dropzone.append("<div class=\"description\">Add image</div>");
                }
                if (!$dropzone.find("div.js-fail")[0]) {
                    $dropzone.append("<div class=\"js-fail failed\" style=\"display: none\">Something went wrong :(</div>");
                }
                if (!$dropzone.find("button.js-fail")[0]) {
                    $dropzone.append("<button class=\"js-fail btn btn-green\" style=\"display: none\">Try Again</button>");
                }
                if (!$dropzone.find("a.image-url")[0]) {
                    $dropzone.append("<a class=\"image-url\" title=\"Add image from URL\"><span class=\"hidden\">URL</span></a>");
                }
                // if (!$dropzone.find('a.image-webcam')[0]) {
                //     $dropzone.append('<a class="image-webcam" title="Add image from webcam"><span class="hidden">Webcam</span></a>');
                // }
            },

            removeExtras: function removeExtras() {
                $dropzone.find("span.media, div.js-upload-progress, a.image-url, a.image-upload, a.image-webcam, div.js-fail, button.js-fail, a.js-cancel").remove();
            },

            initWithDropzone: function initWithDropzone() {
                var self = this;

                // This is the start point if no image exists
                $dropzone.find("img.js-upload-target").css({ display: "none" });
                $dropzone.find("div.description").show();
                $dropzone.removeClass("pre-image-uploader image-uploader-url").addClass("image-uploader");
                this.removeExtras();
                this.buildExtras();
                this.bindFileUpload();
                if (!settings.fileStorage) {
                    self.initUrl();
                    return;
                }
                $dropzone.find("a.image-url").on("click", function () {
                    self.initUrl();
                });
            },
            initUrl: function initUrl() {
                var self = this,
                    val;
                this.removeExtras();
                $dropzone.addClass("image-uploader-url").removeClass("pre-image-uploader");
                $dropzone.find(".js-fileupload").addClass("right");
                if (settings.fileStorage) {
                    $dropzone.append($cancel);
                }
                $dropzone.find(".js-cancel").on("click", function () {
                    $dropzone.find(".js-url").remove();
                    $dropzone.find(".js-fileupload").removeClass("right");
                    $dropzone.trigger("imagecleared");
                    self.removeExtras();
                    self.initWithDropzone();
                });

                $dropzone.find("div.description").before($url);

                if (settings.editor) {
                    $dropzone.find("div.js-url").append("<button class=\"btn btn-blue js-button-accept\">Save</button>");
                }

                $dropzone.find(".js-button-accept").on("click", function () {
                    val = $dropzone.find(".js-upload-url").val();
                    $dropzone.find("div.description").hide();
                    $dropzone.find(".js-fileupload").removeClass("right");
                    $dropzone.find(".js-url").remove();
                    if (val === "") {
                        $dropzone.trigger("uploadsuccess", "http://");
                        self.initWithDropzone();
                    } else {
                        self.complete(val);
                    }
                });

                // Only show the toggle icon if there is a dropzone mode to go back to
                if (settings.fileStorage !== false) {
                    $dropzone.append("<a class=\"image-upload\" title=\"Add image\"><span class=\"hidden\">Upload</span></a>");
                }

                $dropzone.find("a.image-upload").on("click", function () {
                    $dropzone.find(".js-url").remove();
                    $dropzone.find(".js-fileupload").removeClass("right");
                    self.initWithDropzone();
                });
            },

            initWithImage: function initWithImage() {
                var self = this;

                // This is the start point if an image already exists
                $dropzone.removeClass("image-uploader image-uploader-url").addClass("pre-image-uploader");
                $dropzone.find("div.description").hide();
                $dropzone.find("img.js-upload-target").show();
                $dropzone.append($cancel);
                $dropzone.find(".js-cancel").on("click", function () {
                    $dropzone.find("img.js-upload-target").attr({ src: "" });
                    $dropzone.find("div.description").show();
                    $dropzone.trigger("imagecleared");
                    $dropzone.delay(2500).animate({ opacity: 100 }, 1000, function () {
                        self.init();
                    });

                    $dropzone.trigger("uploadsuccess", "http://");
                    self.initWithDropzone();
                });
            },

            init: function init() {
                var imageTarget = $dropzone.find("img.js-upload-target");
                // First check if field image is defined by checking for js-upload-target class
                if (!imageTarget[0]) {
                    // This ensures there is an image we can hook into to display uploaded image
                    $dropzone.prepend("<img class=\"js-upload-target\" style=\"display: none\"  src=\"\" />");
                }
                $(".js-button-accept").prop("disabled", false);
                if (imageTarget.attr("src") === "" || imageTarget.attr("src") === undefined) {
                    this.initWithDropzone();
                } else {
                    this.initWithImage();
                }
            },

            reset: function reset() {
                $dropzone.find(".js-url").remove();
                $dropzone.find(".js-fileupload").removeClass("right");
                this.removeExtras();
                this.initWithDropzone();
            }
        });
    };

    upload = function (options) {
        var settings = $.extend({
            progressbar: true,
            editor: false,
            fileStorage: true
        }, options);

        return this.each(function () {
            var $dropzone = $(this),
                ui;

            ui = new UploadUi($dropzone, settings);
            this.uploaderUi = ui;
            ui.init();
        });
    };

    exports['default'] = upload;

});
define('ghost/components/gh-activating-list-item', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var ActivatingListItem = Ember['default'].Component.extend({
        tagName: "li",
        classNameBindings: ["active"],
        active: false,

        unfocusLink: (function () {
            this.$("a").blur();
        }).on("click")
    });

    exports['default'] = ActivatingListItem;

});
define('ghost/components/gh-blog-url', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var blogUrl = Ember['default'].Component.extend({
        tagName: ""
    });

    exports['default'] = blogUrl;

});
define('ghost/components/gh-cm-editor', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    /* global CodeMirror */
    var CodeMirrorEditor = Ember['default'].Component.extend({

        // DOM stuff
        classNameBindings: ["isFocused:focused"],
        isFocused: false,

        value: "", // make sure a value exists
        editor: null, // reference to CodeMirror editor

        // options for the editor
        lineNumbers: true,
        indentUnit: 4,
        mode: "htmlmixed",
        theme: "xq-light",

        didInsertElement: function didInsertElement() {
            var options = this.getProperties("lineNumbers", "indentUnit", "mode", "theme"),
                self = this,
                editor;
            editor = new CodeMirror(this.get("element"), options);
            editor.getDoc().setValue(this.get("value"));

            // events
            editor.on("focus", function () {
                self.set("isFocused", true);
            });
            editor.on("blur", function () {
                self.set("isFocused", false);
            });
            editor.on("change", function () {
                self.set("value", editor.getDoc().getValue());
            });

            this.set("editor", editor);
        },

        willDestroyElement: function willDestroyElement() {
            var editor = this.get("editor").getWrapperElement();
            editor.parentNode.removeChild(editor);
            this.set("editor", null);
        }

    });

    exports['default'] = CodeMirrorEditor;

});
define('ghost/components/gh-dropdown-button', ['exports', 'ember', 'ghost/mixins/dropdown-mixin'], function (exports, Ember, DropdownMixin) {

    'use strict';

    var DropdownButton = Ember['default'].Component.extend(DropdownMixin['default'], {
        tagName: "button",
        attributeBindings: "role",
        role: "button",

        // matches with the dropdown this button toggles
        dropdownName: null,

        // Notify dropdown service this dropdown should be toggled
        click: function click(event) {
            this._super(event);
            this.get("dropdown").toggleDropdown(this.get("dropdownName"), this);
        }
    });

    exports['default'] = DropdownButton;

});
define('ghost/components/gh-dropdown', ['exports', 'ember', 'ghost/mixins/dropdown-mixin'], function (exports, Ember, DropdownMixin) {

    'use strict';

    var GhostDropdown = Ember['default'].Component.extend(DropdownMixin['default'], {
        classNames: "ghost-dropdown",
        name: null,
        closeOnClick: false,

        // Helps track the user re-opening the menu while it's fading out.
        closing: false,

        // Helps track whether the dropdown is open or closes, or in a transition to either
        isOpen: false,

        // Managed the toggle between the fade-in and fade-out classes
        fadeIn: Ember['default'].computed("isOpen", "closing", function () {
            return this.get("isOpen") && !this.get("closing");
        }),

        classNameBindings: ["fadeIn:fade-in-scale:fade-out", "isOpen:open:closed"],

        open: function open() {
            this.set("isOpen", true);
            this.set("closing", false);
            this.set("button.isOpen", true);
        },

        close: function close() {
            var self = this;

            this.set("closing", true);

            if (this.get("button")) {
                this.set("button.isOpen", false);
            }
            this.$().on("animationend webkitAnimationEnd oanimationend MSAnimationEnd", function (event) {
                if (event.originalEvent.animationName === "fade-out") {
                    if (self.get("closing")) {
                        self.set("isOpen", false);
                        self.set("closing", false);
                    }
                }
            });
        },

        // Called by the dropdown service when any dropdown button is clicked.
        toggle: function toggle(options) {
            var isClosing = this.get("closing"),
                isOpen = this.get("isOpen"),
                name = this.get("name"),
                button = this.get("button"),
                targetDropdownName = options.target;

            if (name === targetDropdownName && (!isOpen || isClosing)) {
                if (!button) {
                    button = options.button;
                    this.set("button", button);
                }
                this.open();
            } else if (isOpen) {
                this.close();
            }
        },

        click: function click(event) {
            this._super(event);

            if (this.get("closeOnClick")) {
                return this.close();
            }
        },

        didInsertElement: function didInsertElement() {
            this._super();

            var dropdownService = this.get("dropdown");

            dropdownService.on("close", this, this.close);
            dropdownService.on("toggle", this, this.toggle);
        },

        willDestroyElement: function willDestroyElement() {
            this._super();

            var dropdownService = this.get("dropdown");

            dropdownService.off("close", this, this.close);
            dropdownService.off("toggle", this, this.toggle);
        }
    });

    exports['default'] = GhostDropdown;

});
define('ghost/components/gh-ed-editor', ['exports', 'ember', 'ghost/mixins/ed-editor-api', 'ghost/mixins/ed-editor-shortcuts', 'ghost/mixins/ed-editor-scroll'], function (exports, Ember, EditorAPI, EditorShortcuts, EditorScroll) {

    'use strict';

    var Editor;

    Editor = Ember['default'].TextArea.extend(EditorAPI['default'], EditorShortcuts['default'], EditorScroll['default'], {
        focus: true,

        /**
         * Tell the controller about focusIn events, will trigger an autosave on a new document
         */
        focusIn: function focusIn() {
            this.sendAction("onFocusIn");
        },

        /**
         * Check if the textarea should have focus, and set it if necessary
         */
        setFocus: (function () {
            if (this.get("focus")) {
                this.$().val(this.$().val()).focus();
            }
        }).on("didInsertElement"),

        /**
         * Tell the controller about this component
         */
        didInsertElement: function didInsertElement() {
            this.sendAction("setEditor", this);

            Ember['default'].run.scheduleOnce("afterRender", this, this.afterRenderEvent);
        },

        afterRenderEvent: function afterRenderEvent() {
            if (this.get("focus") && this.get("focusCursorAtEnd")) {
                this.setSelection("end");
            }
        },

        /**
         * Disable editing in the textarea (used while an upload is in progress)
         */
        disable: function disable() {
            var textarea = this.get("element");
            textarea.setAttribute("readonly", "readonly");
        },

        /**
         * Reenable editing in the textarea
         */
        enable: function enable() {
            var textarea = this.get("element");
            textarea.removeAttribute("readonly");
        }
    });

    exports['default'] = Editor;

});
define('ghost/components/gh-ed-preview', ['exports', 'ember', 'ghost/assets/lib/uploader'], function (exports, Ember, uploader) {

    'use strict';

    var Preview = Ember['default'].Component.extend({
        didInsertElement: function didInsertElement() {
            this.set("scrollWrapper", this.$().closest(".entry-preview-content"));
            Ember['default'].run.scheduleOnce("afterRender", this, this.dropzoneHandler);
        },

        adjustScrollPosition: (function () {
            var scrollWrapper = this.get("scrollWrapper"),
                scrollPosition = this.get("scrollPosition");

            scrollWrapper.scrollTop(scrollPosition);
        }).observes("scrollPosition"),

        dropzoneHandler: function dropzoneHandler() {
            var dropzones = $(".js-drop-zone");

            uploader['default'].call(dropzones, {
                editor: true,
                fileStorage: this.get("config.fileStorage")
            });

            dropzones.on("uploadstart", Ember['default'].run.bind(this, "sendAction", "uploadStarted"));
            dropzones.on("uploadfailure", Ember['default'].run.bind(this, "sendAction", "uploadFinished"));
            dropzones.on("uploadsuccess", Ember['default'].run.bind(this, "sendAction", "uploadFinished"));
            dropzones.on("uploadsuccess", Ember['default'].run.bind(this, "sendAction", "uploadSuccess"));

            // Set the current height so we can listen
            this.set("height", this.$().height());
        },

        // fire off 'enable' API function from uploadManager
        // might need to make sure markdown has been processed first
        reInitDropzones: (function () {
            Ember['default'].run.scheduleOnce("afterRender", this, this.dropzoneHandler);
        }).observes("markdown")
    });

    exports['default'] = Preview;

});
define('ghost/components/gh-file-upload', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var FileUpload = Ember['default'].Component.extend({
        _file: null,

        uploadButtonText: "Text",

        uploadButtonDisabled: true,

        change: function change(event) {
            this.set("uploadButtonDisabled", false);
            this.sendAction("onAdd");
            this._file = event.target.files[0];
        },

        onUpload: "onUpload",

        actions: {
            upload: function upload() {
                if (!this.uploadButtonDisabled && this._file) {
                    this.sendAction("onUpload", this._file);
                }

                // Prevent double post by disabling the button.
                this.set("uploadButtonDisabled", true);
            }
        }
    });

    exports['default'] = FileUpload;

});
define('ghost/components/gh-form', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var Form = Ember['default'].View.extend({
        tagName: "form",
        attributeBindings: ["enctype"],
        reset: function reset() {
            this.$().get(0).reset();
        },
        didInsertElement: function didInsertElement() {
            this.get("controller").on("reset", this, this.reset);
        },
        willClearRender: function willClearRender() {
            this.get("controller").off("reset", this, this.reset);
        }
    });

    exports['default'] = Form;

});
define('ghost/components/gh-input', ['exports', 'ember', 'ghost/mixins/text-input'], function (exports, Ember, TextInputMixin) {

	'use strict';

	var Input = Ember['default'].TextField.extend(TextInputMixin['default']);

	exports['default'] = Input;

});
define('ghost/components/gh-modal-dialog', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var ModalDialog = Ember['default'].Component.extend({
        didInsertElement: function didInsertElement() {
            this.$(".js-modal-container, .js-modal-background").addClass("fade-in open");
            this.$(".js-modal").addClass("open");
        },

        close: function close() {
            var self = this;

            this.$(".js-modal, .js-modal-background").removeClass("fade-in").addClass("fade-out");

            // The background should always be the last thing to fade out, so check on that instead of the content
            this.$(".js-modal-background").on("animationend webkitAnimationEnd oanimationend MSAnimationEnd", function (event) {
                if (event.originalEvent.animationName === "fade-out") {
                    self.$(".js-modal, .js-modal-background").removeClass("open");
                }
            });

            this.sendAction();
        },

        confirmaccept: "confirmAccept",
        confirmreject: "confirmReject",

        actions: {
            closeModal: function closeModal() {
                this.close();
            },
            confirm: function confirm(type) {
                this.sendAction("confirm" + type);
                this.close();
            },
            noBubble: Ember['default'].K
        },

        klass: Ember['default'].computed("type", "style", function () {
            var classNames = [];

            classNames.push(this.get("type") ? "modal-" + this.get("type") : "modal");

            if (this.get("style")) {
                this.get("style").split(",").forEach(function (style) {
                    classNames.push("modal-style-" + style);
                });
            }

            return classNames.join(" ");
        }),

        acceptButtonClass: Ember['default'].computed("confirm.accept.buttonClass", function () {
            return this.get("confirm.accept.buttonClass") ? this.get("confirm.accept.buttonClass") : "btn btn-green";
        }),

        rejectButtonClass: Ember['default'].computed("confirm.reject.buttonClass", function () {
            return this.get("confirm.reject.buttonClass") ? this.get("confirm.reject.buttonClass") : "btn btn-red";
        })
    });

    exports['default'] = ModalDialog;

});
define('ghost/components/gh-navitem-url-input', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    function joinUrlParts(url, path) {
        if (path[0] !== "/" && url.slice(-1) !== "/") {
            path = "/" + path;
        } else if (path[0] === "/" && url.slice(-1) === "/") {
            path = path.slice(1);
        }

        return url + path;
    }

    var NavItemUrlInputComponent = Ember['default'].TextField.extend({
        classNameBindings: ["fakePlaceholder"],

        isBaseUrl: Ember['default'].computed("baseUrl", "value", function () {
            return this.get("baseUrl") === this.get("value");
        }),

        fakePlaceholder: Ember['default'].computed("isBaseUrl", "hasFocus", function () {
            return this.get("isBaseUrl") && this.get("last") && !this.get("hasFocus");
        }),

        isRelative: Ember['default'].computed("value", function () {
            return !validator.isURL(this.get("value")) && this.get("value").indexOf("mailto:") !== 0;
        }),

        didInsertElement: function didInsertElement() {
            var url = this.get("url"),
                baseUrl = this.get("baseUrl");

            this.set("value", url);

            // if we have a relative url, create the absolute url to be displayed in the input
            if (this.get("isRelative")) {
                url = joinUrlParts(baseUrl, url);
                this.set("value", url);
            }
        },

        focusIn: function focusIn(event) {
            this.set("hasFocus", true);

            if (this.get("isBaseUrl")) {
                // position the cursor at the end of the input
                Ember['default'].run.next(function (el) {
                    var length = el.value.length;

                    el.setSelectionRange(length, length);
                }, event.target);
            }
        },

        keyDown: function keyDown(event) {
            // delete the "placeholder" value all at once
            if (this.get("isBaseUrl") && (event.keyCode === 8 || event.keyCode === 46)) {
                this.set("value", "");

                event.preventDefault();
            }
        },

        keyPress: function keyPress(event) {
            // enter key
            if (event.keyCode === 13) {
                event.preventDefault();
                this.notifyUrlChanged();
            }

            return true;
        },

        focusOut: function focusOut() {
            this.set("hasFocus", false);

            this.notifyUrlChanged();
        },

        notifyUrlChanged: function notifyUrlChanged() {
            this.set("value", this.get("value").trim());

            var url = this.get("value"),
                baseUrl = this.get("baseUrl");

            // if we have a relative url, create the absolute url to be displayed in the input
            if (this.get("isRelative")) {
                this.set("value", joinUrlParts(baseUrl, url));
            }

            this.sendAction("change", url);
        }
    });

    exports['default'] = NavItemUrlInputComponent;

});
define('ghost/components/gh-navitem', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var NavItemComponent = Ember['default'].Component.extend({
        classNames: "navigation-item",

        attributeBindings: ["order:data-order"],
        order: Ember['default'].computed.readOnly("navItem.order"),

        keyPress: function keyPress(event) {
            // enter key
            if (event.keyCode === 13) {
                event.preventDefault();
                this.get("controller").send("addItem");
            }
        },

        actions: {
            addItem: function addItem() {
                this.sendAction("addItem");
            },

            deleteItem: function deleteItem(item) {
                this.sendAction("deleteItem", item);
            },

            updateUrl: function updateUrl(value) {
                this.sendAction("updateUrl", value, this.get("navItem"));
            }
        }
    });

    exports['default'] = NavItemComponent;

});
define('ghost/components/gh-notification', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var NotificationComponent = Ember['default'].Component.extend({
        classNames: ["js-bb-notification"],

        typeClass: Ember['default'].computed(function () {
            var classes = "",
                message = this.get("message"),
                type,
                dismissible;

            // Check to see if we're working with a DS.Model or a plain JS object
            if (typeof message.toJSON === "function") {
                type = message.get("type");
                dismissible = message.get("dismissible");
            } else {
                type = message.type;
                dismissible = message.dismissible;
            }

            classes += "notification-" + type;

            if (type === "success" && dismissible !== false) {
                classes += " notification-passive";
            }

            return classes;
        }),

        didInsertElement: function didInsertElement() {
            var self = this;

            self.$().on("animationend webkitAnimationEnd oanimationend MSAnimationEnd", function (event) {
                if (event.originalEvent.animationName === "fade-out") {
                    self.notifications.removeObject(self.get("message"));
                }
            });
        },

        actions: {
            closeNotification: function closeNotification() {
                var self = this;
                self.notifications.closeNotification(self.get("message"));
            }
        }
    });

    exports['default'] = NotificationComponent;

});
define('ghost/components/gh-notifications', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var NotificationsComponent = Ember['default'].Component.extend({
        tagName: "aside",
        classNames: "notifications",
        classNameBindings: ["location"],

        messages: Ember['default'].computed.filter("notifications", function (notification) {
            // If this instance of the notifications component has no location affinity
            // then it gets all notifications
            if (!this.get("location")) {
                return true;
            }

            var displayLocation = typeof notification.toJSON === "function" ? notification.get("location") : notification.location;

            return this.get("location") === displayLocation;
        }),

        messageCountObserver: (function () {
            this.sendAction("notify", this.get("messages").length);
        }).observes("messages.[]")
    });

    exports['default'] = NotificationsComponent;

});
define('ghost/components/gh-popover-button', ['exports', 'ember', 'ghost/components/gh-dropdown-button'], function (exports, Ember, DropdownButton) {

    'use strict';

    var PopoverButton = DropdownButton['default'].extend({
        click: Ember['default'].K, // We don't want clicks on popovers, but dropdowns have them. So `K`ill them here.

        mouseEnter: function mouseEnter(event) {
            this._super(event);
            this.get("dropdown").toggleDropdown(this.get("popoverName"), this);
        },

        mouseLeave: function mouseLeave(event) {
            this._super(event);
            this.get("dropdown").toggleDropdown(this.get("popoverName"), this);
        }
    });

    exports['default'] = PopoverButton;

});
define('ghost/components/gh-popover', ['exports', 'ghost/components/gh-dropdown'], function (exports, GhostDropdown) {

    'use strict';

    var GhostPopover = GhostDropdown['default'].extend({
        classNames: "ghost-popover"
    });

    exports['default'] = GhostPopover;

});
define('ghost/components/gh-role-selector', ['exports', 'ember', 'ghost/components/gh-select'], function (exports, Ember, GhostSelect) {

    'use strict';

    var RolesSelector = GhostSelect['default'].extend({
        roles: Ember['default'].computed.alias("options"),

        options: Ember['default'].computed(function () {
            var rolesPromise = this.store.find("role", { permissions: "assign" });

            return Ember['default'].ArrayProxy.extend(Ember['default'].PromiseProxyMixin).create({ promise: rolesPromise });
        })
    });

    exports['default'] = RolesSelector;

});
define('ghost/components/gh-select', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var GhostSelect = Ember['default'].Component.extend({
        tagName: "span",
        classNames: ["gh-select"],
        attributeBindings: ["tabindex"],

        tabindex: "0", // 0 must be a string, or else it's interpreted as false

        options: null,
        initialValue: null,

        resolvedOptions: null,
        resolvedInitialValue: null,

        // Convert promises to their values
        init: function init() {
            var self = this;

            this._super.apply(this, arguments);

            Ember['default'].RSVP.hash({
                resolvedOptions: this.get("options"),
                resolvedInitialValue: this.get("initialValue")
            }).then(function (resolvedHash) {
                self.setProperties(resolvedHash);

                // Run after render to ensure the <option>s have rendered
                Ember['default'].run.schedule("afterRender", function () {
                    self.setInitialValue();
                });
            });
        },

        setInitialValue: function setInitialValue() {
            var initialValue = this.get("resolvedInitialValue"),
                options = this.get("resolvedOptions"),
                initialValueIndex = options.indexOf(initialValue);

            if (initialValueIndex > -1) {
                this.$("option:eq(" + initialValueIndex + ")").prop("selected", true);
            }
        },

        // Called by DOM events
        change: function change() {
            this._changeSelection();
        },

        // Send value to specified action
        _changeSelection: function _changeSelection() {
            var value = this._selectedValue();

            Ember['default'].set(this, "value", value);
            this.sendAction("onChange", value);
        },

        _selectedValue: function _selectedValue() {
            var selectedIndex = this.$("select")[0].selectedIndex;

            return this.get("options").objectAt(selectedIndex);
        }
    });

    exports['default'] = GhostSelect;

});
define('ghost/components/gh-tab-pane', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var TabPane = Ember['default'].Component.extend({
        classNameBindings: ["active"],

        tabsManager: Ember['default'].computed(function () {
            return this.nearestWithProperty("isTabsManager");
        }),

        tab: Ember['default'].computed("tabsManager.tabs.[]", "tabsManager.tabPanes.[]", function () {
            var index = this.get("tabsManager.tabPanes").indexOf(this),
                tabs = this.get("tabsManager.tabs");

            return tabs && tabs.objectAt(index);
        }),

        active: Ember['default'].computed.alias("tab.active"),

        // Register with the tabs manager
        registerWithTabs: (function () {
            this.get("tabsManager").registerTabPane(this);
        }).on("didInsertElement"),

        unregisterWithTabs: (function () {
            this.get("tabsManager").unregisterTabPane(this);
        }).on("willDestroyElement")
    });

    exports['default'] = TabPane;

});
define('ghost/components/gh-tab', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var Tab = Ember['default'].Component.extend({
        tabsManager: Ember['default'].computed(function () {
            return this.nearestWithProperty("isTabsManager");
        }),

        active: Ember['default'].computed("tabsManager.activeTab", function () {
            return this.get("tabsManager.activeTab") === this;
        }),

        index: Ember['default'].computed("tabsManager.tabs.@each", function () {
            return this.get("tabsManager.tabs").indexOf(this);
        }),

        // Select on click
        click: function click() {
            this.get("tabsManager").select(this);
        },

        // Registration methods
        registerWithTabs: (function () {
            this.get("tabsManager").registerTab(this);
        }).on("didInsertElement"),

        unregisterWithTabs: (function () {
            this.get("tabsManager").unregisterTab(this);
        }).on("willDestroyElement")
    });

    exports['default'] = Tab;

});
define('ghost/components/gh-tabs-manager', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  var TabsManager = Ember['default'].Component.extend({
      activeTab: null,
      tabs: [],
      tabPanes: [],

      // Called when a gh-tab is clicked.
      select: function select(tab) {
          this.set("activeTab", tab);
          this.sendAction("selected");
      },

      // Used by children to find this tabsManager
      isTabsManager: true,

      // Register tabs and their panes to allow for
      // interaction between components.
      registerTab: function registerTab(tab) {
          this.get("tabs").addObject(tab);
      },

      unregisterTab: function unregisterTab(tab) {
          this.get("tabs").removeObject(tab);
      },

      registerTabPane: function registerTabPane(tabPane) {
          this.get("tabPanes").addObject(tabPane);
      },

      unregisterTabPane: function unregisterTabPane(tabPane) {
          this.get("tabPanes").removeObject(tabPane);
      }
  });

  exports['default'] = TabsManager;

});
define('ghost/components/gh-textarea', ['exports', 'ember', 'ghost/mixins/text-input'], function (exports, Ember, TextInputMixin) {

	'use strict';

	var TextArea = Ember['default'].TextArea.extend(TextInputMixin['default']);

	exports['default'] = TextArea;

});
define('ghost/components/gh-trim-focus-input', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var TrimFocusInput = Ember['default'].TextField.extend({
        focus: true,

        attributeBindings: ["autofocus"],

        autofocus: Ember['default'].computed(function () {
            if (this.get("focus")) {
                return device.ios() ? false : "autofocus";
            }

            return false;
        }),

        didInsertElement: function didInsertElement() {
            // This fix is required until Mobile Safari has reliable
            // autofocus, select() or focus() support
            if (this.get("focus") && !device.ios()) {
                this.$().val(this.$().val()).focus();
            }
        },

        focusOut: function focusOut() {
            var text = this.$().val();

            this.$().val(text.trim());
        }
    });

    exports['default'] = TrimFocusInput;

});
define('ghost/components/gh-upload-modal', ['exports', 'ember', 'ghost/components/gh-modal-dialog', 'ghost/assets/lib/uploader', 'ghost/utils/caja-sanitizers'], function (exports, Ember, ModalDialog, upload, cajaSanitizers) {

    'use strict';

    var UploadModal = ModalDialog['default'].extend({
        layoutName: "components/gh-modal-dialog",

        didInsertElement: function didInsertElement() {
            this._super();
            upload['default'].call(this.$(".js-drop-zone"), { fileStorage: this.get("config.fileStorage") });
        },
        keyDown: function keyDown() {
            this.setErrorState(false);
        },
        setErrorState: function setErrorState(state) {
            if (state) {
                this.$(".js-upload-url").addClass("error");
            } else {
                this.$(".js-upload-url").removeClass("error");
            }
        },
        confirm: {
            reject: {
                func: function func() {
                    // The function called on rejection
                    return true;
                },
                buttonClass: "btn btn-default",
                text: "Cancel" // The reject button text
            },
            accept: {
                buttonClass: "btn btn-blue right",
                text: "Save", // The accept button text: 'Save'
                func: function func() {
                    var imageType = "model." + this.get("imageType"),
                        value;

                    if (this.$(".js-upload-url").val()) {
                        value = this.$(".js-upload-url").val();

                        if (!Ember['default'].isEmpty(value) && !cajaSanitizers['default'].url(value)) {
                            this.setErrorState(true);
                            return { message: "Image URI is not valid" };
                        }
                    } else {
                        value = this.$(".js-upload-target").attr("src");
                    }

                    this.set(imageType, value);
                    return true;
                }
            }
        },

        actions: {
            closeModal: function closeModal() {
                this.sendAction();
            },
            confirm: function confirm(type) {
                var result,
                    func = this.get("confirm." + type + ".func");

                if (typeof func === "function") {
                    result = func.apply(this);
                }

                if (!result.message) {
                    this.sendAction();
                    this.sendAction("confirm" + type);
                }
            }
        }
    });

    exports['default'] = UploadModal;

});
define('ghost/components/gh-uploader', ['exports', 'ember', 'ghost/assets/lib/uploader'], function (exports, Ember, uploader) {

    'use strict';

    var PostImageUploader = Ember['default'].Component.extend({
        classNames: ["image-uploader", "js-post-image-upload"],

        imageSource: Ember['default'].computed("image", function () {
            return this.get("image") || "";
        }),

        setup: (function () {
            var $this = this.$(),
                self = this;

            this.set("uploaderReference", uploader['default'].call($this, {
                editor: true,
                fileStorage: this.get("config.fileStorage")
            }));

            $this.on("uploadsuccess", function (event, result) {
                if (result && result !== "" && result !== "http://") {
                    self.sendAction("uploaded", result);
                }
            });

            $this.on("imagecleared", function () {
                self.sendAction("canceled");
            });
        }).on("didInsertElement"),

        removeListeners: (function () {
            var $this = this.$();

            $this.off();
            $this.find(".js-cancel").off();
        }).on("willDestroyElement")
    });

    exports['default'] = PostImageUploader;

});
define('ghost/components/gh-url-preview', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var urlPreview = Ember['default'].Component.extend({
        classNames: "ghost-url-preview",
        prefix: null,
        slug: null,

        url: Ember['default'].computed("slug", function () {
            // Get the blog URL and strip the scheme
            var blogUrl = this.get("config").blogUrl,
                noSchemeBlogUrl = blogUrl.substr(blogUrl.indexOf("://") + 3),
                // Remove `http[s]://`

            // Get the prefix and slug values
            prefix = this.get("prefix") ? this.get("prefix") + "/" : "",
                slug = this.get("slug") ? this.get("slug") + "/" : "",

            // Join parts of the URL together with slashes
            theUrl = noSchemeBlogUrl + "/" + prefix + slug;

            return theUrl;
        })
    });

    exports['default'] = urlPreview;

});
define('ghost/controllers/application', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var ApplicationController = Ember['default'].Controller.extend({
        // jscs: disable
        hideNav: Ember['default'].computed.match("currentPath", /(error|signin|signup|setup|forgotten|reset)/),
        // jscs: enable

        topNotificationCount: 0,
        showGlobalMobileNav: false,
        showSettingsMenu: false,

        userImage: Ember['default'].computed("session.user.image", function () {
            return this.get("session.user.image") || this.get("ghostPaths.url").asset("/shared/img/user-image.png");
        }),

        userImageBackground: Ember['default'].computed("userImage", function () {
            return ("background-image: url(" + this.get("userImage") + ")").htmlSafe();
        }),

        userImageAlt: Ember['default'].computed("session.user.name", function () {
            var name = this.get("session.user.name");

            return name ? name + "'s profile picture" : "Profile picture";
        }),

        actions: {
            topNotificationChange: function topNotificationChange(count) {
                this.set("topNotificationCount", count);
            }
        }
    });

    exports['default'] = ApplicationController;

});
define('ghost/controllers/editor/edit', ['exports', 'ember', 'ghost/mixins/editor-base-controller'], function (exports, Ember, EditorControllerMixin) {

	'use strict';

	var EditorEditController = Ember['default'].Controller.extend(EditorControllerMixin['default']);

	exports['default'] = EditorEditController;

});
define('ghost/controllers/editor/new', ['exports', 'ember', 'ghost/mixins/editor-base-controller'], function (exports, Ember, EditorControllerMixin) {

    'use strict';

    var EditorNewController = Ember['default'].Controller.extend(EditorControllerMixin['default'], {
        // Overriding autoSave on the base controller, as the new controller shouldn't be autosaving
        autoSave: Ember['default'].K,
        actions: {
            /**
              * Redirect to editor after the first save
              */
            save: function save(options) {
                var self = this;
                return this._super(options).then(function (model) {
                    if (model.get("id")) {
                        self.replaceRoute("editor.edit", model);
                    }
                });
            }
        }
    });

    exports['default'] = EditorNewController;

});
define('ghost/controllers/error', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var ErrorController = Ember['default'].Controller.extend({
        code: Ember['default'].computed("content.status", function () {
            return this.get("content.status") > 200 ? this.get("content.status") : 500;
        }),
        message: Ember['default'].computed("content.statusText", function () {
            if (this.get("code") === 404) {
                return "No Ghost Found";
            }

            return this.get("content.statusText") !== "error" ? this.get("content.statusText") : "Internal Server Error";
        }),
        stack: false
    });

    exports['default'] = ErrorController;

});
define('ghost/controllers/feature', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var FeatureController = Ember['default'].Controller.extend(Ember['default'].PromiseProxyMixin, {
        init: function init() {
            var promise;

            promise = this.store.find("setting", { type: "blog,theme" }).then(function (settings) {
                return settings.get("firstObject");
            });

            this.set("promise", promise);
        },

        setting: Ember['default'].computed.alias("content"),

        labs: Ember['default'].computed("isSettled", "setting.labs", function () {
            var value = {};

            if (this.get("isFulfilled")) {
                try {
                    value = JSON.parse(this.get("setting.labs") || {});
                } catch (err) {
                    value = {};
                }
            }

            return value;
        })
    });

    exports['default'] = FeatureController;

});
define('ghost/controllers/forgotten', ['exports', 'ember', 'ghost/utils/ajax', 'ghost/mixins/validation-engine'], function (exports, Ember, ajax, ValidationEngine) {

    'use strict';

    var ForgottenController = Ember['default'].Controller.extend(ValidationEngine['default'], {
        email: "",
        submitting: false,

        // ValidationEngine settings
        validationType: "forgotten",

        actions: {
            submit: function submit() {
                var data = this.getProperties("email");
                this.send("doForgotten", data, true);
            },
            doForgotten: function doForgotten(data, delay) {
                var self = this;
                this.set("email", data.email);
                this.toggleProperty("submitting");
                this.validate({ format: false }).then(function () {
                    ajax['default']({
                        url: self.get("ghostPaths.url").api("authentication", "passwordreset"),
                        type: "POST",
                        data: {
                            passwordreset: [{
                                email: data.email
                            }]
                        }
                    }).then(function () {
                        self.toggleProperty("submitting");
                        self.notifications.showSuccess("Please check your email for instructions.", { delayed: delay });
                        self.set("email", "");
                        self.transitionToRoute("signin");
                    })["catch"](function (resp) {
                        self.toggleProperty("submitting");
                        self.notifications.showAPIError(resp, { defaultErrorText: "There was a problem with the reset, please try again." });
                    });
                })["catch"](function (errors) {
                    self.toggleProperty("submitting");
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    exports['default'] = ForgottenController;

});
define('ghost/controllers/modals/copy-html', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var CopyHTMLController = Ember['default'].Controller.extend({

        generatedHTML: Ember['default'].computed.alias("model.generatedHTML")

    });

    exports['default'] = CopyHTMLController;

});
define('ghost/controllers/modals/delete-all', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var DeleteAllController = Ember['default'].Controller.extend({
        actions: {
            confirmAccept: function confirmAccept() {
                var self = this;

                ic.ajax.request(this.get("ghostPaths.url").api("db"), {
                    type: "DELETE"
                }).then(function () {
                    self.notifications.showSuccess("All content deleted from database.");
                    self.store.unloadAll("post");
                    self.store.unloadAll("tag");
                })["catch"](function (response) {
                    self.notifications.showErrors(response);
                });
            },

            confirmReject: function confirmReject() {
                return false;
            }
        },

        confirm: {
            accept: {
                text: "Delete",
                buttonClass: "btn btn-red"
            },
            reject: {
                text: "Cancel",
                buttonClass: "btn btn-default btn-minor"
            }
        }
    });

    exports['default'] = DeleteAllController;

});
define('ghost/controllers/modals/delete-post', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var DeletePostController = Ember['default'].Controller.extend({
        actions: {
            confirmAccept: function confirmAccept() {
                var self = this,
                    model = this.get("model");

                // definitely want to clear the data store and post of any unsaved, client-generated tags
                model.updateTags();

                model.destroyRecord().then(function () {
                    self.get("dropdown").closeDropdowns();
                    self.transitionToRoute("posts.index");
                    self.notifications.showSuccess("Your post has been deleted.", { delayed: true });
                }, function () {
                    self.notifications.showError("Your post could not be deleted. Please try again.");
                });
            },

            confirmReject: function confirmReject() {
                return false;
            }
        },

        confirm: {
            accept: {
                text: "Delete",
                buttonClass: "btn btn-red"
            },
            reject: {
                text: "Cancel",
                buttonClass: "btn btn-default btn-minor"
            }
        }
    });

    exports['default'] = DeletePostController;

});
define('ghost/controllers/modals/delete-tag', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var DeleteTagController = Ember['default'].Controller.extend({
        postInflection: Ember['default'].computed("model.post_count", function () {
            return this.get("model.post_count") > 1 ? "posts" : "post";
        }),

        actions: {
            confirmAccept: function confirmAccept() {
                var tag = this.get("model"),
                    name = tag.get("name"),
                    self = this;

                this.send("closeSettingsMenu");

                tag.destroyRecord().then(function () {
                    self.notifications.showSuccess("Deleted " + name);
                })["catch"](function (error) {
                    self.notifications.showAPIError(error);
                });
            },

            confirmReject: function confirmReject() {
                return false;
            }
        },

        confirm: {
            accept: {
                text: "Delete",
                buttonClass: "btn btn-red"
            },
            reject: {
                text: "Cancel",
                buttonClass: "btn btn-default btn-minor"
            }
        }
    });

    exports['default'] = DeleteTagController;

});
define('ghost/controllers/modals/delete-user', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var DeleteUserController = Ember['default'].Controller.extend({
        userPostCount: Ember['default'].computed("model.id", function () {
            var promise,
                query = {
                author: this.get("model.slug"),
                status: "all"
            };

            promise = this.store.find("post", query).then(function (results) {
                return results.meta.pagination.total;
            });

            return Ember['default'].Object.extend(Ember['default'].PromiseProxyMixin, {
                count: Ember['default'].computed.alias("content"),

                inflection: Ember['default'].computed("count", function () {
                    return this.get("count") > 1 ? "posts" : "post";
                })
            }).create({ promise: promise });
        }),

        actions: {
            confirmAccept: function confirmAccept() {
                var self = this,
                    user = this.get("model");

                user.destroyRecord().then(function () {
                    self.store.unloadAll("post");
                    self.transitionToRoute("settings.users");
                    self.notifications.showSuccess("The user has been deleted.", { delayed: true });
                }, function () {
                    self.notifications.showError("The user could not be deleted. Please try again.");
                });
            },

            confirmReject: function confirmReject() {
                return false;
            }
        },

        confirm: {
            accept: {
                text: "Delete User",
                buttonClass: "btn btn-red"
            },
            reject: {
                text: "Cancel",
                buttonClass: "btn btn-default btn-minor"
            }
        }
    });

    exports['default'] = DeleteUserController;

});
define('ghost/controllers/modals/invite-new-user', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var InviteNewUserController = Ember['default'].Controller.extend({
        // Used to set the initial value for the dropdown
        authorRole: Ember['default'].computed(function () {
            var self = this;

            return this.store.find("role").then(function (roles) {
                var authorRole = roles.findBy("name", "Author");

                // Initialize role as well.
                self.set("role", authorRole);
                self.set("authorRole", authorRole);

                return authorRole;
            });
        }),

        confirm: {
            accept: {
                text: "send invitation now"
            },
            reject: {
                buttonClass: "hidden"
            }
        },

        actions: {
            setRole: function setRole(role) {
                this.set("role", role);
            },

            confirmAccept: function confirmAccept() {
                var email = this.get("email"),
                    role = this.get("role"),
                    self = this,
                    newUser;

                // reset the form and close the modal
                self.set("email", "");
                self.set("role", self.get("authorRole"));
                self.send("closeModal");

                this.store.find("user").then(function (result) {
                    var invitedUser = result.findBy("email", email);

                    if (invitedUser) {
                        if (invitedUser.get("status") === "invited" || invitedUser.get("status") === "invited-pending") {
                            self.notifications.showWarn("A user with that email address was already invited.");
                        } else {
                            self.notifications.showWarn("A user with that email address already exists.");
                        }
                    } else {
                        newUser = self.store.createRecord("user", {
                            email: email,
                            status: "invited",
                            role: role
                        });

                        newUser.save().then(function () {
                            var notificationText = "Invitation sent! (" + email + ")";

                            // If sending the invitation email fails, the API will still return a status of 201
                            // but the user's status in the response object will be 'invited-pending'.
                            if (newUser.get("status") === "invited-pending") {
                                self.notifications.showWarn("Invitation email was not sent.  Please try resending.");
                            } else {
                                self.notifications.showSuccess(notificationText);
                            }
                        })["catch"](function (errors) {
                            newUser.deleteRecord();
                            self.notifications.showErrors(errors);
                        });
                    }
                });
            },

            confirmReject: function confirmReject() {
                return false;
            }
        }
    });

    exports['default'] = InviteNewUserController;

});
define('ghost/controllers/modals/leave-editor', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var LeaveEditorController = Ember['default'].Controller.extend({
        args: Ember['default'].computed.alias("model"),

        actions: {
            confirmAccept: function confirmAccept() {
                var args = this.get("args"),
                    editorController,
                    model,
                    transition;

                if (Ember['default'].isArray(args)) {
                    editorController = args[0];
                    transition = args[1];
                    model = editorController.get("model");
                }

                if (!transition || !editorController) {
                    this.notifications.showError("Sorry, there was an error in the application. Please let the Ghost team know what happened.");

                    return true;
                }

                // definitely want to clear the data store and post of any unsaved, client-generated tags
                model.updateTags();

                if (model.get("isNew")) {
                    // the user doesn't want to save the new, unsaved post, so delete it.
                    model.deleteRecord();
                } else {
                    // roll back changes on model props
                    model.rollback();
                }

                // setting isDirty to false here allows willTransition on the editor route to succeed
                editorController.set("isDirty", false);

                // since the transition is now certain to complete, we can unset window.onbeforeunload here
                window.onbeforeunload = null;

                transition.retry();
            },

            confirmReject: function confirmReject() {}
        },

        confirm: {
            accept: {
                text: "Leave",
                buttonClass: "btn btn-red"
            },
            reject: {
                text: "Stay",
                buttonClass: "btn btn-default btn-minor"
            }
        }
    });

    exports['default'] = LeaveEditorController;

});
define('ghost/controllers/modals/signin', ['exports', 'ember', 'ghost/mixins/validation-engine'], function (exports, Ember, ValidationEngine) {

    'use strict';

    exports['default'] = Ember['default'].Controller.extend(SimpleAuth.AuthenticationControllerMixin, ValidationEngine['default'], {
        needs: "application",

        authenticator: "simple-auth-authenticator:oauth2-password-grant",

        validationType: "signin",

        identification: Ember['default'].computed("session.user.email", function () {
            return this.get("session.user.email");
        }),

        actions: {
            authenticate: function authenticate() {
                var appController = this.get("controllers.application"),
                    self = this;

                appController.set("skipAuthSuccessHandler", true);

                this._super(this.getProperties("identification", "password")).then(function () {
                    self.send("closeModal");
                    self.notifications.showSuccess("Login successful.");
                    self.set("password", "");
                })["catch"](function () {})["finally"](function () {
                    appController.set("skipAuthSuccessHandler", undefined);
                });
            },

            validateAndAuthenticate: function validateAndAuthenticate() {
                var self = this;

                // Manually trigger events for input fields, ensuring legacy compatibility with
                // browsers and password managers that don't send proper events on autofill
                $("#login").find("input").trigger("change");

                this.validate({ format: false }).then(function () {
                    self.notifications.closePassive();
                    self.send("authenticate");
                })["catch"](function (errors) {
                    self.notifications.showErrors(errors);
                });
            },

            confirmAccept: function confirmAccept() {
                this.send("validateAndAuthenticate");
            }
        }
    });

    // if authentication fails a rejected promise will be returned.
    // it needs to be caught so it doesn't generate an exception in the console,
    // but it's actually "handled" by the sessionAuthenticationFailed action handler.

});
define('ghost/controllers/modals/transfer-owner', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var TransferOwnerController = Ember['default'].Controller.extend({
        actions: {
            confirmAccept: function confirmAccept() {
                var user = this.get("model"),
                    url = this.get("ghostPaths.url").api("users", "owner"),
                    self = this;

                self.get("dropdown").closeDropdowns();

                ic.ajax.request(url, {
                    type: "PUT",
                    data: {
                        owner: [{
                            id: user.get("id")
                        }]
                    }
                }).then(function (response) {
                    // manually update the roles for the users that just changed roles
                    // because store.pushPayload is not working with embedded relations
                    if (response && Ember['default'].isArray(response.users)) {
                        response.users.forEach(function (userJSON) {
                            var user = self.store.getById("user", userJSON.id),
                                role = self.store.getById("role", userJSON.roles[0].id);

                            user.set("role", role);
                        });
                    }

                    self.notifications.showSuccess("Ownership successfully transferred to " + user.get("name"));
                })["catch"](function (error) {
                    self.notifications.showAPIError(error);
                });
            },

            confirmReject: function confirmReject() {
                return false;
            }
        },

        confirm: {
            accept: {
                text: "Yep - I'm sure",
                buttonClass: "btn btn-red"
            },
            reject: {
                text: "Cancel",
                buttonClass: "btn btn-default btn-minor"
            }
        }
    });

    exports['default'] = TransferOwnerController;

});
define('ghost/controllers/modals/upload', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var UploadController = Ember['default'].Controller.extend({
        acceptEncoding: "image/*",
        actions: {
            confirmAccept: function confirmAccept() {
                var self = this;

                this.get("model").save().then(function (model) {
                    self.notifications.showSuccess("Saved");
                    return model;
                })["catch"](function (err) {
                    self.notifications.showErrors(err);
                });
            },

            confirmReject: function confirmReject() {
                return false;
            }
        }
    });

    exports['default'] = UploadController;

});
define('ghost/controllers/post-settings-menu', ['exports', 'ember', 'ghost/utils/date-formatting', 'ghost/mixins/settings-menu-controller', 'ghost/models/slug-generator', 'ghost/utils/bound-one-way', 'ghost/utils/isNumber'], function (exports, Ember, date_formatting, SettingsMenuMixin, SlugGenerator, boundOneWay, isNumber) {

    'use strict';

    var PostSettingsMenuController = Ember['default'].Controller.extend(SettingsMenuMixin['default'], {
        debounceId: null,
        lastPromise: null,
        selectedAuthor: null,
        uploaderReference: null,

        initializeSelectedAuthor: (function () {
            var self = this;

            return this.get("model.author").then(function (author) {
                self.set("selectedAuthor", author);
                return author;
            });
        }).observes("model"),

        changeAuthor: (function () {
            var author = this.get("model.author"),
                selectedAuthor = this.get("selectedAuthor"),
                model = this.get("model"),
                self = this;

            // return if nothing changed
            if (selectedAuthor.get("id") === author.get("id")) {
                return;
            }

            model.set("author", selectedAuthor);

            // if this is a new post (never been saved before), don't try to save it
            if (this.get("model.isNew")) {
                return;
            }

            model.save()["catch"](function (errors) {
                self.showErrors(errors);
                self.set("selectedAuthor", author);
                model.rollback();
            });
        }).observes("selectedAuthor"),

        authors: Ember['default'].computed(function () {
            // Loaded asynchronously, so must use promise proxies.
            var deferred = {};

            deferred.promise = this.store.find("user", { limit: "all" }).then(function (users) {
                return users.rejectBy("id", "me").sortBy("name");
            }).then(function (users) {
                return users.filter(function (user) {
                    return user.get("active");
                });
            });

            return Ember['default'].ArrayProxy.extend(Ember['default'].PromiseProxyMixin).create(deferred);
        }),

        /*jshint unused:false */
        publishedAtValue: Ember['default'].computed("model.published_at", function (key, value) {
            var pubDate = this.get("model.published_at");

            // We're using a fake setter to reset
            // the cache for this property
            if (arguments.length > 1) {
                return date_formatting.formatDate(moment());
            }

            if (pubDate) {
                return date_formatting.formatDate(pubDate);
            }

            return date_formatting.formatDate(moment());
        }),
        /*jshint unused:true */

        slugValue: boundOneWay['default']("model.slug"),

        // Lazy load the slug generator
        slugGenerator: Ember['default'].computed(function () {
            return SlugGenerator['default'].create({
                ghostPaths: this.get("ghostPaths"),
                slugType: "post"
            });
        }),

        // Requests slug from title
        generateAndSetSlug: function generateAndSetSlug(destination) {
            var self = this,
                title = this.get("model.titleScratch"),
                afterSave = this.get("lastPromise"),
                promise;

            // Only set an "untitled" slug once per post
            if (title === "(Untitled)" && this.get("model.slug")) {
                return;
            }

            promise = Ember['default'].RSVP.resolve(afterSave).then(function () {
                return self.get("slugGenerator").generateSlug(title).then(function (slug) {
                    self.set(destination, slug);
                })["catch"](function () {});
            });

            this.set("lastPromise", promise);
        },

        metaTitleScratch: boundOneWay['default']("model.meta_title"),
        metaDescriptionScratch: boundOneWay['default']("model.meta_description"),

        seoTitle: Ember['default'].computed("model.titleScratch", "metaTitleScratch", function () {
            var metaTitle = this.get("metaTitleScratch") || "";

            metaTitle = metaTitle.length > 0 ? metaTitle : this.get("model.titleScratch");

            if (metaTitle.length > 70) {
                metaTitle = metaTitle.substring(0, 70).trim();
                metaTitle = Ember['default'].Handlebars.Utils.escapeExpression(metaTitle);
                metaTitle = Ember['default'].String.htmlSafe(metaTitle + "&hellip;");
            }

            return metaTitle;
        }),

        seoDescription: Ember['default'].computed("model.scratch", "metaDescriptionScratch", function () {
            var metaDescription = this.get("metaDescriptionScratch") || "",
                el,
                html = "",
                placeholder;

            if (metaDescription.length > 0) {
                placeholder = metaDescription;
            } else {
                el = $(".rendered-markdown");

                // Get rendered markdown
                if (el !== undefined && el.length > 0) {
                    html = el.clone();
                    html.find(".js-drop-zone").remove();
                    html = html[0].innerHTML;
                }

                // Strip HTML
                placeholder = $("<div />", { html: html }).text();
                // Replace new lines and trim
                // jscs: disable
                placeholder = placeholder.replace(/\n+/g, " ").trim();
                // jscs: enable
            }

            if (placeholder.length > 156) {
                // Limit to 156 characters
                placeholder = placeholder.substring(0, 156).trim();
                placeholder = Ember['default'].Handlebars.Utils.escapeExpression(placeholder);
                placeholder = Ember['default'].String.htmlSafe(placeholder + "&hellip;");
            }

            return placeholder;
        }),

        seoURL: Ember['default'].computed("model.slug", function () {
            var blogUrl = this.get("config").blogUrl,
                seoSlug = this.get("model.slug") ? this.get("model.slug") : "",
                seoURL = blogUrl + "/" + seoSlug;

            // only append a slash to the URL if the slug exists
            if (seoSlug) {
                seoURL += "/";
            }

            if (seoURL.length > 70) {
                seoURL = seoURL.substring(0, 70).trim();
                seoURL = Ember['default'].String.htmlSafe(seoURL + "&hellip;");
            }

            return seoURL;
        }),

        // observe titleScratch, keeping the post's slug in sync
        // with it until saved for the first time.
        addTitleObserver: (function () {
            if (this.get("model.isNew") || this.get("model.title") === "(Untitled)") {
                this.addObserver("model.titleScratch", this, "titleObserver");
            }
        }).observes("model"),

        titleObserver: function titleObserver() {
            var debounceId,
                title = this.get("model.title");

            // generate a slug if a post is new and doesn't have a title yet or
            // if the title is still '(Untitled)' and the slug is unaltered.
            if (this.get("model.isNew") && !title || title === "(Untitled)") {
                debounceId = Ember['default'].run.debounce(this, "generateAndSetSlug", "model.slug", 700);
            }

            this.set("debounceId", debounceId);
        },

        showErrors: function showErrors(errors) {
            errors = Ember['default'].isArray(errors) ? errors : [errors];
            this.notifications.showErrors(errors);
        },

        showSuccess: function showSuccess(message) {
            this.notifications.showSuccess(message);
        },

        actions: {
            togglePage: function togglePage() {
                var self = this;

                this.toggleProperty("model.page");
                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get("model.isNew")) {
                    return;
                }

                this.get("model").save()["catch"](function (errors) {
                    self.showErrors(errors);
                    self.get("model").rollback();
                });
            },

            toggleFeatured: function toggleFeatured() {
                var self = this;

                this.toggleProperty("model.featured");

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get("model.isNew")) {
                    return;
                }

                this.get("model").save(this.get("saveOptions"))["catch"](function (errors) {
                    self.showErrors(errors);
                    self.get("model").rollback();
                });
            },

            /**
             * triggered by user manually changing slug
             */
            updateSlug: function updateSlug(newSlug) {
                var slug = this.get("model.slug"),
                    self = this;

                newSlug = newSlug || slug;

                newSlug = newSlug && newSlug.trim();

                // Ignore unchanged slugs or candidate slugs that are empty
                if (!newSlug || slug === newSlug) {
                    // reset the input to its previous state
                    this.set("slugValue", slug);

                    return;
                }

                this.get("slugGenerator").generateSlug(newSlug).then(function (serverSlug) {
                    // If after getting the sanitized and unique slug back from the API
                    // we end up with a slug that matches the existing slug, abort the change
                    if (serverSlug === slug) {
                        return;
                    }

                    // Because the server transforms the candidate slug by stripping
                    // certain characters and appending a number onto the end of slugs
                    // to enforce uniqueness, there are cases where we can get back a
                    // candidate slug that is a duplicate of the original except for
                    // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

                    // get the last token out of the slug candidate and see if it's a number
                    var slugTokens = serverSlug.split("-"),
                        check = Number(slugTokens.pop());

                    // if the candidate slug is the same as the existing slug except
                    // for the incrementor then the existing slug should be used
                    if (isNumber['default'](check) && check > 0) {
                        if (slug === slugTokens.join("-") && serverSlug !== newSlug) {
                            self.set("slugValue", slug);

                            return;
                        }
                    }

                    self.set("model.slug", serverSlug);

                    if (self.hasObserverFor("model.titleScratch")) {
                        self.removeObserver("model.titleScratch", self, "titleObserver");
                    }

                    // If this is a new post.  Don't save the model.  Defer the save
                    // to the user pressing the save button
                    if (self.get("model.isNew")) {
                        return;
                    }

                    return self.get("model").save();
                })["catch"](function (errors) {
                    self.showErrors(errors);
                    self.get("model").rollback();
                });
            },

            /**
             * Parse user's set published date.
             * Action sent by post settings menu view.
             * (#1351)
             */
            setPublishedAt: function setPublishedAt(userInput) {
                var errMessage = "",
                    newPublishedAt = date_formatting.parseDateString(userInput),
                    publishedAt = this.get("model.published_at"),
                    self = this;

                if (!userInput) {
                    // Clear out the published_at field for a draft
                    if (this.get("model.isDraft")) {
                        this.set("model.published_at", null);
                    }

                    return;
                }

                // Validate new Published date
                if (!newPublishedAt.isValid()) {
                    errMessage = "Published Date must be a valid date with format: " + "DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)";
                }
                if (newPublishedAt.diff(new Date(), "h") > 0) {
                    errMessage = "Published Date cannot currently be in the future.";
                }

                // If errors, notify and exit.
                if (errMessage) {
                    this.showErrors(errMessage);

                    return;
                }

                // Do nothing if the user didn't actually change the date
                if (publishedAt && publishedAt.isSame(newPublishedAt)) {
                    return;
                }

                // Validation complete
                this.set("model.published_at", newPublishedAt);

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get("model.isNew")) {
                    return;
                }

                this.get("model").save()["catch"](function (errors) {
                    self.showErrors(errors);
                    self.get("model").rollback();
                });
            },

            setMetaTitle: function setMetaTitle(metaTitle) {
                var self = this,
                    currentTitle = this.get("model.meta_title") || "";

                // Only update if the title has changed
                if (currentTitle === metaTitle) {
                    return;
                }

                this.set("model.meta_title", metaTitle);

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get("model.isNew")) {
                    return;
                }

                this.get("model").save()["catch"](function (errors) {
                    self.showErrors(errors);
                });
            },

            setMetaDescription: function setMetaDescription(metaDescription) {
                var self = this,
                    currentDescription = this.get("model.meta_description") || "";

                // Only update if the description has changed
                if (currentDescription === metaDescription) {
                    return;
                }

                this.set("model.meta_description", metaDescription);

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get("model.isNew")) {
                    return;
                }

                this.get("model").save()["catch"](function (errors) {
                    self.showErrors(errors);
                });
            },

            setCoverImage: function setCoverImage(image) {
                var self = this;

                this.set("model.image", image);

                if (this.get("model.isNew")) {
                    return;
                }

                this.get("model").save()["catch"](function (errors) {
                    self.showErrors(errors);
                    self.get("model").rollback();
                });
            },

            clearCoverImage: function clearCoverImage() {
                var self = this;

                this.set("model.image", "");

                if (this.get("model.isNew")) {
                    return;
                }

                this.get("model").save()["catch"](function (errors) {
                    self.showErrors(errors);
                    self.get("model").rollback();
                });
            },

            resetUploader: function resetUploader() {
                var uploader = this.get("uploaderReference");

                if (uploader && uploader[0]) {
                    uploader[0].uploaderUi.reset();
                }
            },

            resetPubDate: function resetPubDate() {
                this.set("publishedAtValue", "");
            }
        }
    });

    exports['default'] = PostSettingsMenuController;

    // Nothing to do (would be nice to log this somewhere though),
    // but a rejected promise needs to be handled here so that a resolved
    // promise is returned.

});
define('ghost/controllers/post-tags-input', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var PostTagsInputController = Ember['default'].Controller.extend({
        tagEnteredOrder: Ember['default'].A(),

        tags: Ember['default'].computed("parentController.model.tags", function () {
            var proxyTags = Ember['default'].ArrayProxy.create({
                content: this.get("parentController.model.tags")
            }),
                temp = proxyTags.get("arrangedContent").slice();

            proxyTags.get("arrangedContent").clear();

            this.get("tagEnteredOrder").forEach(function (tagName) {
                var tag = temp.find(function (tag) {
                    return tag.get("name") === tagName;
                });

                if (tag) {
                    proxyTags.get("arrangedContent").addObject(tag);
                    temp.removeObject(tag);
                }
            });

            proxyTags.get("arrangedContent").unshiftObjects(temp);

            return proxyTags;
        }),

        suggestions: null,
        newTagText: null,

        actions: {
            // triggered when the view is inserted so that later store.all('tag')
            // queries hit a full store cache and we don't see empty or out-of-date
            // suggestion lists
            loadAllTags: function loadAllTags() {
                this.store.find("tag", { limit: "all" });
            },

            addNewTag: function addNewTag() {
                var newTagText = this.get("newTagText"),
                    searchTerm,
                    existingTags,
                    newTag;

                if (Ember['default'].isEmpty(newTagText) || this.hasTag(newTagText)) {
                    this.send("reset");
                    return;
                }

                newTagText = newTagText.trim();
                searchTerm = newTagText.toLowerCase();

                // add existing tag if we have a match
                existingTags = this.store.all("tag").filter(function (tag) {
                    if (tag.get("isNew")) {
                        return false;
                    }

                    return tag.get("name").toLowerCase() === searchTerm;
                });

                if (existingTags.get("length")) {
                    this.send("addTag", existingTags.get("firstObject"));
                } else {
                    // otherwise create a new one
                    newTag = this.store.createRecord("tag");
                    newTag.set("name", newTagText);

                    this.send("addTag", newTag);
                }

                this.send("reset");
            },

            addTag: function addTag(tag) {
                if (!Ember['default'].isEmpty(tag)) {
                    this.get("tags").addObject(tag);
                    this.get("tagEnteredOrder").addObject(tag.get("name"));
                }

                this.send("reset");
            },

            deleteTag: function deleteTag(tag) {
                if (tag) {
                    this.get("tags").removeObject(tag);
                    this.get("tagEnteredOrder").removeObject(tag.get("name"));
                }
            },

            deleteLastTag: function deleteLastTag() {
                this.send("deleteTag", this.get("tags.lastObject"));
            },

            selectSuggestion: function selectSuggestion(suggestion) {
                if (!Ember['default'].isEmpty(suggestion)) {
                    this.get("suggestions").setEach("selected", false);
                    suggestion.set("selected", true);
                }
            },

            selectNextSuggestion: function selectNextSuggestion() {
                var suggestions = this.get("suggestions"),
                    selectedSuggestion = this.get("selectedSuggestion"),
                    currentIndex,
                    newSelection;

                if (!Ember['default'].isEmpty(suggestions)) {
                    currentIndex = suggestions.indexOf(selectedSuggestion);
                    if (currentIndex + 1 < suggestions.get("length")) {
                        newSelection = suggestions[currentIndex + 1];
                        this.send("selectSuggestion", newSelection);
                    } else {
                        suggestions.setEach("selected", false);
                    }
                }
            },

            selectPreviousSuggestion: function selectPreviousSuggestion() {
                var suggestions = this.get("suggestions"),
                    selectedSuggestion = this.get("selectedSuggestion"),
                    currentIndex,
                    lastIndex,
                    newSelection;

                if (!Ember['default'].isEmpty(suggestions)) {
                    currentIndex = suggestions.indexOf(selectedSuggestion);
                    if (currentIndex === -1) {
                        lastIndex = suggestions.get("length") - 1;
                        this.send("selectSuggestion", suggestions[lastIndex]);
                    } else if (currentIndex - 1 >= 0) {
                        newSelection = suggestions[currentIndex - 1];
                        this.send("selectSuggestion", newSelection);
                    } else {
                        suggestions.setEach("selected", false);
                    }
                }
            },

            addSelectedSuggestion: function addSelectedSuggestion() {
                var suggestion = this.get("selectedSuggestion");

                if (Ember['default'].isEmpty(suggestion)) {
                    return;
                }

                this.send("addTag", suggestion.get("tag"));
            },

            reset: function reset() {
                this.set("suggestions", null);
                this.set("newTagText", null);
            }
        },

        selectedSuggestion: Ember['default'].computed("suggestions.@each.selected", function () {
            var suggestions = this.get("suggestions");

            if (suggestions && suggestions.get("length")) {
                return suggestions.filterBy("selected").get("firstObject");
            } else {
                return null;
            }
        }),

        updateSuggestionsList: (function () {
            var searchTerm = this.get("newTagText"),
                matchingTags,

            // Limit the suggestions number
            maxSuggestions = 5,
                suggestions = Ember['default'].A();

            if (!searchTerm || Ember['default'].isEmpty(searchTerm.trim())) {
                this.set("suggestions", null);
                return;
            }

            searchTerm = searchTerm.trim();

            matchingTags = this.findMatchingTags(searchTerm);
            matchingTags = matchingTags.slice(0, maxSuggestions);
            matchingTags.forEach(function (matchingTag) {
                var suggestion = this.makeSuggestionObject(matchingTag, searchTerm);
                suggestions.pushObject(suggestion);
            }, this);

            this.set("suggestions", suggestions);
        }).observes("newTagText"),

        findMatchingTags: function findMatchingTags(searchTerm) {
            var matchingTags,
                self = this,
                allTags = this.store.all("tag").filterBy("isNew", false),
                deDupe = {};

            if (allTags.get("length") === 0) {
                return [];
            }

            searchTerm = searchTerm.toLowerCase();

            matchingTags = allTags.filter(function (tag) {
                var tagNameMatches,
                    hasAlreadyBeenAdded,
                    tagName = tag.get("name");

                tagNameMatches = tagName.toLowerCase().indexOf(searchTerm) !== -1;
                hasAlreadyBeenAdded = self.hasTag(tagName);

                if (tagNameMatches && !hasAlreadyBeenAdded) {
                    if (typeof deDupe[tagName] === "undefined") {
                        deDupe[tagName] = 1;
                    } else {
                        deDupe[tagName] += 1;
                    }
                }

                return deDupe[tagName] === 1;
            });

            return matchingTags;
        },

        hasTag: function hasTag(tagName) {
            return this.get("tags").mapBy("name").contains(tagName);
        },

        makeSuggestionObject: function makeSuggestionObject(matchingTag, _searchTerm) {
            var searchTerm = Ember['default'].Handlebars.Utils.escapeExpression(_searchTerm),
                regexEscapedSearchTerm = searchTerm.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"),
                tagName = Ember['default'].Handlebars.Utils.escapeExpression(matchingTag.get("name")),
                regex = new RegExp("(" + regexEscapedSearchTerm + ")", "gi"),
                highlightedName,
                suggestion = Ember['default'].Object.create();

            highlightedName = tagName.replace(regex, "<mark>$1</mark>");
            highlightedName = Ember['default'].String.htmlSafe(highlightedName);

            suggestion.set("tag", matchingTag);
            suggestion.set("highlightedName", highlightedName);

            return suggestion;
        }
    });

    exports['default'] = PostTagsInputController;

});
define('ghost/controllers/posts', ['exports', 'ember', 'ghost/mixins/pagination-controller'], function (exports, Ember, PaginationControllerMixin) {

    'use strict';

    function publishedAtCompare(item1, item2) {
        var published1 = item1.get("published_at"),
            published2 = item2.get("published_at");

        if (!published1 && !published2) {
            return 0;
        }

        if (!published1 && published2) {
            return -1;
        }

        if (!published2 && published1) {
            return 1;
        }

        return Ember['default'].compare(published1.valueOf(), published2.valueOf());
    }

    var PostsController = Ember['default'].ArrayController.extend(PaginationControllerMixin['default'], {
        // See PostsRoute's shortcuts
        postListFocused: Ember['default'].computed.equal("keyboardFocus", "postList"),
        postContentFocused: Ember['default'].computed.equal("keyboardFocus", "postContent"),
        // this will cause the list to re-sort when any of these properties change on any of the models
        sortProperties: ["status", "published_at", "updated_at"],

        // override Ember.SortableMixin
        //
        // this function will keep the posts list sorted when loading individual/bulk
        // models from the server, even if records in between haven't been loaded.
        // this can happen when reloading the page on the Editor or PostsPost routes.
        //
        // a custom sort function is needed in order to sort the posts list the same way the server would:
        //     status: ASC
        //     published_at: DESC
        //     updated_at: DESC
        //     id: DESC
        orderBy: function orderBy(item1, item2) {
            var updated1 = item1.get("updated_at"),
                updated2 = item2.get("updated_at"),
                idResult,
                statusResult,
                updatedAtResult,
                publishedAtResult;

            // when `updated_at` is undefined, the model is still
            // being written to with the results from the server
            if (item1.get("isNew") || !updated1) {
                return -1;
            }

            if (item2.get("isNew") || !updated2) {
                return 1;
            }

            idResult = Ember['default'].compare(parseInt(item1.get("id")), parseInt(item2.get("id")));
            statusResult = Ember['default'].compare(item1.get("status"), item2.get("status"));
            updatedAtResult = Ember['default'].compare(updated1.valueOf(), updated2.valueOf());
            publishedAtResult = publishedAtCompare(item1, item2);

            if (statusResult === 0) {
                if (publishedAtResult === 0) {
                    if (updatedAtResult === 0) {
                        // This should be DESC
                        return idResult * -1;
                    }
                    // This should be DESC
                    return updatedAtResult * -1;
                }
                // This should be DESC
                return publishedAtResult * -1;
            }

            return statusResult;
        },

        init: function init() {
            // let the PaginationControllerMixin know what type of model we will be paginating
            // this is necessary because we do not have access to the model inside the Controller::init method
            this._super({ modelType: "post" });
        }
    });

    exports['default'] = PostsController;

});
define('ghost/controllers/posts/post', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var PostController = Ember['default'].Controller.extend({
        isPublished: Ember['default'].computed.equal("model.status", "published"),
        classNameBindings: ["model.featured"],

        authorName: Ember['default'].computed("model.author.name", "model.author.email", function () {
            return this.get("model.author.name") || this.get("model.author.email");
        }),

        authorAvatar: Ember['default'].computed("model.author.image", function () {
            return this.get("model.author.image") || this.get("ghostPaths.url").asset("/shared/img/user-image.png");
        }),

        authorAvatarBackground: Ember['default'].computed("authorAvatar", function () {
            return ("background-image: url(" + this.get("authorAvatar") + ")").htmlSafe();
        }),

        actions: {
            toggleFeatured: function toggleFeatured() {
                var options = { disableNProgress: true },
                    self = this;

                this.toggleProperty("model.featured");
                this.get("model").save(options)["catch"](function (errors) {
                    self.notifications.showErrors(errors);
                });
            },
            showPostContent: function showPostContent() {
                this.transitionToRoute("posts.post", this.get("model"));
            }
        }
    });

    exports['default'] = PostController;

});
define('ghost/controllers/reset', ['exports', 'ember', 'ghost/utils/ajax', 'ghost/mixins/validation-engine'], function (exports, Ember, ajax, ValidationEngine) {

    'use strict';

    var ResetController = Ember['default'].Controller.extend(ValidationEngine['default'], {
        newPassword: "",
        ne2Password: "",
        token: "",
        submitting: false,

        validationType: "reset",

        email: Ember['default'].computed("token", function () {
            // The token base64 encodes the email (and some other stuff),
            // each section is divided by a '|'. Email comes second.
            return atob(this.get("token")).split("|")[1];
        }),

        // Used to clear sensitive information
        clearData: function clearData() {
            this.setProperties({
                newPassword: "",
                ne2Password: "",
                token: ""
            });
        },

        actions: {
            submit: function submit() {
                var credentials = this.getProperties("newPassword", "ne2Password", "token"),
                    self = this;

                this.toggleProperty("submitting");
                this.validate({ format: false }).then(function () {
                    ajax['default']({
                        url: self.get("ghostPaths.url").api("authentication", "passwordreset"),
                        type: "PUT",
                        data: {
                            passwordreset: [credentials]
                        }
                    }).then(function (resp) {
                        self.toggleProperty("submitting");
                        self.notifications.showSuccess(resp.passwordreset[0].message, true);
                        self.get("session").authenticate("simple-auth-authenticator:oauth2-password-grant", {
                            identification: self.get("email"),
                            password: credentials.newPassword
                        });
                    })["catch"](function (response) {
                        self.notifications.showAPIError(response);
                        self.toggleProperty("submitting");
                    });
                })["catch"](function (error) {
                    self.toggleProperty("submitting");
                    self.notifications.showErrors(error);
                });
            }
        }
    });

    exports['default'] = ResetController;

});
define('ghost/controllers/settings', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SettingsController = Ember['default'].Controller.extend({

        needs: ["feature"],

        showGeneral: Ember['default'].computed("session.user.name", function () {
            return this.get("session.user.isAuthor") || this.get("session.user.isEditor") ? false : true;
        }),
        showUsers: Ember['default'].computed("session.user.name", function () {
            return this.get("session.user.isAuthor") ? false : true;
        }),
        showTags: Ember['default'].computed("session.user.name", function () {
            return this.get("session.user.isAuthor") ? false : true;
        }),
        showNavigation: Ember['default'].computed("session.user.name", function () {
            return this.get("session.user.isAuthor") || this.get("session.user.isEditor") ? false : true;
        }),
        showCodeInjection: Ember['default'].computed("session.user.name", function () {
            return this.get("session.user.isAuthor") || this.get("session.user.isEditor") ? false : true;
        }),
        showLabs: Ember['default'].computed("session.user.name", function () {
            return this.get("session.user.isAuthor") || this.get("session.user.isEditor") ? false : true;
        }),
        showAbout: Ember['default'].computed("session.user.name", function () {
            return this.get("session.user.isAuthor") ? false : true;
        }),
        showPassProtection: Ember['default'].computed("session.user.name", "controllers.feature.passProtectUI", function () {
            return this.get("session.user.isAuthor") || this.get("session.user.isEditor") || !this.get("controllers.feature.passProtectUI") ? false : true;
        })
    });

    exports['default'] = SettingsController;

});
define('ghost/controllers/settings/about', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SettingsAboutController = Ember['default'].Controller.extend({
        updateNotificationCount: 0,

        actions: {
            updateNotificationChange: function updateNotificationChange(count) {
                this.set("updateNotificationCount", count);
            }
        }
    });

    exports['default'] = SettingsAboutController;

});
define('ghost/controllers/settings/app', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var appStates, SettingsAppController;

    appStates = {
        active: "active",
        working: "working",
        inactive: "inactive"
    };

    SettingsAppController = Ember['default'].Controller.extend({
        appState: appStates.active,
        buttonText: "",

        setAppState: (function () {
            this.set("appState", this.get("active") ? appStates.active : appStates.inactive);
        }).on("init"),

        buttonTextSetter: (function () {
            switch (this.get("appState")) {
                case appStates.active:
                    this.set("buttonText", "Deactivate");
                    break;
                case appStates.inactive:
                    this.set("buttonText", "Activate");
                    break;
                case appStates.working:
                    this.set("buttonText", "Working");
                    break;
            }
        }).observes("appState").on("init"),

        activeClass: Ember['default'].computed("appState", function () {
            return this.appState === appStates.active ? true : false;
        }),

        inactiveClass: Ember['default'].computed("appState", function () {
            return this.appState === appStates.inactive ? true : false;
        }),

        actions: {
            toggleApp: function toggleApp(app) {
                var self = this;

                this.set("appState", appStates.working);

                app.set("active", !app.get("active"));

                app.save().then(function () {
                    self.setAppState();
                }).then(function () {
                    alert("@TODO: Success");
                })["catch"](function () {
                    alert("@TODO: Failure");
                });
            }
        }
    });

    exports['default'] = SettingsAppController;

});
define('ghost/controllers/settings/code-injection', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SettingsCodeInjectionController = Ember['default'].Controller.extend({
        actions: {
            save: function save() {
                var self = this;

                return this.get("model").save().then(function (model) {
                    self.notifications.closePassive();
                    self.notifications.showSuccess("Settings successfully saved.");

                    return model;
                })["catch"](function (errors) {
                    self.notifications.closePassive();
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    exports['default'] = SettingsCodeInjectionController;

});
define('ghost/controllers/settings/general', ['exports', 'ember', 'ghost/utils/random-password'], function (exports, Ember, randomPassword) {

    'use strict';

    var SettingsGeneralController = Ember['default'].Controller.extend({
        selectedTheme: null,

        logoImageSource: Ember['default'].computed("model.logo", function () {
            return this.get("model.logo") || "";
        }),

        coverImageSource: Ember['default'].computed("model.cover", function () {
            return this.get("model.cover") || "";
        }),

        isDatedPermalinks: Ember['default'].computed("model.permalinks", function (key, value) {
            // setter
            if (arguments.length > 1) {
                this.set("model.permalinks", value ? "/:year/:month/:day/:slug/" : "/:slug/");
            }

            // getter
            var slugForm = this.get("model.permalinks");

            return slugForm !== "/:slug/";
        }),

        themes: Ember['default'].computed(function () {
            return this.get("model.availableThemes").reduce(function (themes, t) {
                var theme = {};

                theme.name = t.name;
                theme.label = t["package"] ? t["package"].name + " - " + t["package"].version : t.name;
                theme["package"] = t["package"];
                theme.active = !!t.active;

                themes.push(theme);

                return themes;
            }, []);
        }).readOnly(),

        generatePassword: Ember['default'].observer("model.isPrivate", function () {
            if (this.get("model.isPrivate") && this.get("model.isDirty")) {
                this.get("model").set("password", randomPassword['default']());
            }
        }),

        actions: {
            save: function save() {
                var self = this;

                return this.get("model").save().then(function (model) {
                    self.notifications.showSuccess("Settings successfully saved.");

                    return model;
                })["catch"](function (errors) {
                    self.notifications.showErrors(errors);
                });
            },

            checkPostsPerPage: function checkPostsPerPage() {
                var postsPerPage = this.get("model.postsPerPage");

                if (postsPerPage < 1 || postsPerPage > 1000 || isNaN(postsPerPage)) {
                    this.set("model.postsPerPage", 5);
                }
            }
        }
    });

    exports['default'] = SettingsGeneralController;

});
define('ghost/controllers/settings/labs', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var LabsController = Ember['default'].Controller.extend(Ember['default'].Evented, {
        needs: ["feature"],

        uploadButtonText: "Import",
        importErrors: "",
        labsJSON: Ember['default'].computed("model.labs", function () {
            return JSON.parse(this.get("model.labs") || {});
        }),

        saveLabs: function saveLabs(optionName, optionValue) {
            var self = this,
                labsJSON = this.get("labsJSON");

            // Set new value in the JSON object
            labsJSON[optionName] = optionValue;

            this.set("model.labs", JSON.stringify(labsJSON));

            this.get("model").save()["catch"](function (errors) {
                self.showErrors(errors);
                self.get("model").rollback();
            });
        },

        actions: {
            onUpload: function onUpload(file) {
                var self = this,
                    formData = new FormData();

                this.set("uploadButtonText", "Importing");
                this.set("importErrors", "");
                this.notifications.closePassive();

                formData.append("importfile", file);

                ic.ajax.request(this.get("ghostPaths.url").api("db"), {
                    type: "POST",
                    data: formData,
                    dataType: "json",
                    cache: false,
                    contentType: false,
                    processData: false
                }).then(function () {
                    // Clear the store, so that all the new data gets fetched correctly.
                    self.store.unloadAll("post");
                    self.store.unloadAll("tag");
                    self.store.unloadAll("user");
                    self.store.unloadAll("role");
                    self.store.unloadAll("setting");
                    self.store.unloadAll("notification");
                    self.notifications.showSuccess("Import successful.");
                })["catch"](function (response) {
                    if (response && response.jqXHR && response.jqXHR.responseJSON && response.jqXHR.responseJSON.errors) {
                        self.set("importErrors", response.jqXHR.responseJSON.errors);
                    }

                    self.notifications.showError("Import Failed");
                })["finally"](function () {
                    self.set("uploadButtonText", "Import");
                    self.trigger("reset");
                });
            },

            exportData: function exportData() {
                var iframe = $("#iframeDownload"),
                    downloadURL = this.get("ghostPaths.url").api("db") + "?access_token=" + this.get("session.access_token");

                if (iframe.length === 0) {
                    iframe = $("<iframe>", { id: "iframeDownload" }).hide().appendTo("body");
                }

                iframe.attr("src", downloadURL);
            },

            sendTestEmail: function sendTestEmail() {
                var self = this;

                ic.ajax.request(this.get("ghostPaths.url").api("mail", "test"), {
                    type: "POST"
                }).then(function () {
                    self.notifications.showSuccess("Check your email for the test message.");
                })["catch"](function (error) {
                    if (typeof error.jqXHR !== "undefined") {
                        self.notifications.showAPIError(error);
                    } else {
                        self.notifications.showErrors(error);
                    }
                });
            }
        }
    });

    exports['default'] = LabsController;

});
define('ghost/controllers/settings/navigation', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var NavigationController, NavItem;

    NavItem = Ember['default'].Object.extend({
        label: "",
        url: "",
        last: false,

        isComplete: Ember['default'].computed("label", "url", function () {
            return !(Ember['default'].isBlank(this.get("label").trim()) || Ember['default'].isBlank(this.get("url")));
        })
    });

    NavigationController = Ember['default'].Controller.extend({
        blogUrl: Ember['default'].computed("config.blogUrl", function () {
            var url = this.get("config.blogUrl");

            return url.slice(-1) !== "/" ? url + "/" : url;
        }),

        navigationItems: Ember['default'].computed("model.navigation", function () {
            var navItems, lastItem;

            try {
                navItems = JSON.parse(this.get("model.navigation") || [{}]);
            } catch (e) {
                navItems = [{}];
            }

            navItems = navItems.map(function (item) {
                return NavItem.create(item);
            });

            lastItem = navItems.get("lastObject");
            if (!lastItem || lastItem.get("isComplete")) {
                navItems.addObject(NavItem.create({ last: true }));
            }

            return navItems;
        }),

        updateLastNavItem: Ember['default'].observer("navigationItems.[]", function () {
            var navItems = this.get("navigationItems");

            navItems.forEach(function (item, index, items) {
                if (index === items.length - 1) {
                    item.set("last", true);
                } else {
                    item.set("last", false);
                }
            });
        }),

        actions: {
            addItem: function addItem() {
                var navItems = this.get("navigationItems"),
                    lastItem = navItems.get("lastObject");

                if (lastItem && lastItem.get("isComplete")) {
                    navItems.addObject(NavItem.create({ last: true })); // Adds new blank navItem
                }
            },

            deleteItem: function deleteItem(item) {
                if (!item) {
                    return;
                }

                var navItems = this.get("navigationItems");

                navItems.removeObject(item);
            },

            moveItem: function moveItem(index, newIndex) {
                var navItems = this.get("navigationItems"),
                    item = navItems.objectAt(index);

                navItems.removeAt(index);
                navItems.insertAt(newIndex, item);
            },

            updateUrl: function updateUrl(url, navItem) {
                if (!navItem) {
                    return;
                }

                if (Ember['default'].isBlank(url)) {
                    navItem.set("url", this.get("blogUrl"));

                    return;
                }

                navItem.set("url", url);
            },

            save: function save() {
                var self = this,
                    navSetting,
                    blogUrl = this.get("config").blogUrl,
                    blogUrlRegex = new RegExp("^" + blogUrl + "(.*)", "i"),
                    navItems = this.get("navigationItems"),
                    message = "One of your navigation items has an empty label. " + "<br /> Please enter a new label or delete the item before saving.",
                    match;

                // Don't save if there's a blank label.
                if (navItems.find(function (item) {
                    return !item.get("isComplete") && !item.get("last");
                })) {
                    self.notifications.showErrors([message.htmlSafe()]);
                    return;
                }

                navSetting = navItems.map(function (item) {
                    var label, url;

                    if (!item || !item.get("isComplete")) {
                        return;
                    }

                    label = item.get("label").trim();
                    url = item.get("url").trim();

                    // is this an internal URL?
                    match = url.match(blogUrlRegex);

                    if (match) {
                        url = match[1];

                        // if the last char is not a slash, then add one,
                        // as long as there is no # or . in the URL (anchor or file extension)
                        // this also handles the empty case for the homepage
                        if (url[url.length - 1] !== "/" && url.indexOf("#") === -1 && url.indexOf(".") === -1) {
                            url += "/";
                        }
                    } else if (!validator.isURL(url) && url !== "" && url[0] !== "/" && url.indexOf("mailto:") !== 0) {
                        url = "/" + url;
                    }

                    return { label: label, url: url };
                }).compact();

                this.set("model.navigation", JSON.stringify(navSetting));

                // trigger change event because even if the final JSON is unchanged
                // we need to have navigationItems recomputed.
                this.get("model").notifyPropertyChange("navigation");

                this.notifications.closePassive();

                this.get("model").save().then(function () {
                    self.notifications.showSuccess("Navigation items saved.");
                })["catch"](function (err) {
                    self.notifications.showErrors(err);
                });
            }
        }
    });

    exports['default'] = NavigationController;

});
define('ghost/controllers/settings/tags', ['exports', 'ember', 'ghost/mixins/pagination-controller', 'ghost/mixins/settings-menu-controller', 'ghost/utils/bound-one-way'], function (exports, Ember, PaginationMixin, SettingsMenuMixin, boundOneWay) {

    'use strict';

    var TagsController = Ember['default'].ArrayController.extend(PaginationMixin['default'], SettingsMenuMixin['default'], {
        tags: Ember['default'].computed.alias("model"),

        activeTag: null,
        activeTagNameScratch: boundOneWay['default']("activeTag.name"),
        activeTagSlugScratch: boundOneWay['default']("activeTag.slug"),
        activeTagDescriptionScratch: boundOneWay['default']("activeTag.description"),
        activeTagMetaTitleScratch: boundOneWay['default']("activeTag.meta_title"),
        activeTagMetaDescriptionScratch: boundOneWay['default']("activeTag.meta_description"),

        init: function init(options) {
            options = options || {};
            options.modelType = "tag";
            this._super(options);
        },

        showErrors: function showErrors(errors) {
            errors = Ember['default'].isArray(errors) ? errors : [errors];
            this.notifications.showErrors(errors);
        },

        saveActiveTagProperty: function saveActiveTagProperty(propKey, newValue) {
            var activeTag = this.get("activeTag"),
                currentValue = activeTag.get(propKey),
                self = this;

            newValue = newValue.trim();

            // Quit if there was no change
            if (newValue === currentValue) {
                return;
            }

            activeTag.set(propKey, newValue);

            this.notifications.closePassive();

            activeTag.save()["catch"](function (errors) {
                self.showErrors(errors);
            });
        },

        seoTitle: Ember['default'].computed("scratch", "activeTagNameScratch", "activeTagMetaTitleScratch", function () {
            var metaTitle = this.get("activeTagMetaTitleScratch") || "";

            metaTitle = metaTitle.length > 0 ? metaTitle : this.get("activeTagNameScratch");

            if (metaTitle && metaTitle.length > 70) {
                metaTitle = metaTitle.substring(0, 70).trim();
                metaTitle = Ember['default'].Handlebars.Utils.escapeExpression(metaTitle);
                metaTitle = Ember['default'].String.htmlSafe(metaTitle + "&hellip;");
            }

            return metaTitle;
        }),

        seoURL: Ember['default'].computed("activeTagSlugScratch", function () {
            var blogUrl = this.get("config").blogUrl,
                seoSlug = this.get("activeTagSlugScratch") ? this.get("activeTagSlugScratch") : "",
                seoURL = blogUrl + "/tag/" + seoSlug;

            // only append a slash to the URL if the slug exists
            if (seoSlug) {
                seoURL += "/";
            }

            if (seoURL.length > 70) {
                seoURL = seoURL.substring(0, 70).trim();
                seoURL = Ember['default'].String.htmlSafe(seoURL + "&hellip;");
            }

            return seoURL;
        }),

        seoDescription: Ember['default'].computed("scratch", "activeTagDescriptionScratch", "activeTagMetaDescriptionScratch", function () {
            var metaDescription = this.get("activeTagMetaDescriptionScratch") || "";

            metaDescription = metaDescription.length > 0 ? metaDescription : this.get("activeTagDescriptionScratch");

            if (metaDescription && metaDescription.length > 156) {
                metaDescription = metaDescription.substring(0, 156).trim();
                metaDescription = Ember['default'].Handlebars.Utils.escapeExpression(metaDescription);
                metaDescription = Ember['default'].String.htmlSafe(metaDescription + "&hellip;");
            }

            return metaDescription;
        }),

        actions: {
            newTag: function newTag() {
                this.set("activeTag", this.store.createRecord("tag", { post_count: 0 }));
                this.send("openSettingsMenu");
            },

            editTag: function editTag(tag) {
                this.set("activeTag", tag);
                this.send("openSettingsMenu");
            },

            saveActiveTagName: function saveActiveTagName(name) {
                this.saveActiveTagProperty("name", name);
            },

            saveActiveTagSlug: function saveActiveTagSlug(slug) {
                this.saveActiveTagProperty("slug", slug);
            },

            saveActiveTagDescription: function saveActiveTagDescription(description) {
                this.saveActiveTagProperty("description", description);
            },

            saveActiveTagMetaTitle: function saveActiveTagMetaTitle(metaTitle) {
                this.saveActiveTagProperty("meta_title", metaTitle);
            },

            saveActiveTagMetaDescription: function saveActiveTagMetaDescription(metaDescription) {
                this.saveActiveTagProperty("meta_description", metaDescription);
            },

            setCoverImage: function setCoverImage(image) {
                this.saveActiveTagProperty("image", image);
            },

            clearCoverImage: function clearCoverImage() {
                this.saveActiveTagProperty("image", "");
            }
        }
    });

    exports['default'] = TagsController;

});
define('ghost/controllers/settings/users/index', ['exports', 'ember', 'ghost/mixins/pagination-controller'], function (exports, Ember, PaginationControllerMixin) {

    'use strict';

    var UsersIndexController = Ember['default'].ArrayController.extend(PaginationControllerMixin['default'], {
        init: function init() {
            // let the PaginationControllerMixin know what type of model we will be paginating
            // this is necessary because we do not have access to the model inside the Controller::init method
            this._super({ modelType: "user" });
        },

        users: Ember['default'].computed.alias("model"),

        activeUsers: Ember['default'].computed.filter("users", function (user) {
            return /^active|warn-[1-4]|locked$/.test(user.get("status"));
        }),

        invitedUsers: Ember['default'].computed.filter("users", function (user) {
            var status = user.get("status");

            return status === "invited" || status === "invited-pending";
        })
    });

    exports['default'] = UsersIndexController;

});
define('ghost/controllers/settings/users/user', ['exports', 'ember', 'ghost/models/slug-generator', 'ghost/utils/isNumber', 'ghost/utils/bound-one-way'], function (exports, Ember, SlugGenerator, isNumber, boundOneWay) {

    'use strict';

    var SettingsUserController = Ember['default'].Controller.extend({

        user: Ember['default'].computed.alias("model"),

        email: Ember['default'].computed.readOnly("model.email"),

        slugValue: boundOneWay['default']("model.slug"),

        lastPromise: null,

        coverDefault: Ember['default'].computed("ghostPaths", function () {
            return this.get("ghostPaths.url").asset("/shared/img/user-cover.png");
        }),
        coverImageBackground: Ember['default'].computed("user.cover", "coverDefault", function () {
            var url = this.get("user.cover") || this.get("coverDefault");
            return ("background-image: url(" + url + ")").htmlSafe();
        }),

        coverTitle: Ember['default'].computed("user.name", function () {
            return this.get("user.name") + "'s Cover Image";
        }),

        userDefault: Ember['default'].computed("ghostPaths", function () {
            return this.get("ghostPaths.url").asset("/shared/img/user-image.png");
        }),
        userImageBackground: Ember['default'].computed("user.image", "userDefault", function () {
            var url = this.get("user.image") || this.get("userDefault");
            return ("background-image: url(" + url + ")").htmlSafe();
        }),

        last_login: Ember['default'].computed("user.last_login", function () {
            var lastLogin = this.get("user.last_login");

            return lastLogin ? lastLogin.fromNow() : "(Never)";
        }),

        created_at: Ember['default'].computed("user.created_at", function () {
            var createdAt = this.get("user.created_at");

            return createdAt ? createdAt.fromNow() : "";
        }),

        // Lazy load the slug generator for slugPlaceholder
        slugGenerator: Ember['default'].computed(function () {
            return SlugGenerator['default'].create({
                ghostPaths: this.get("ghostPaths"),
                slugType: "user"
            });
        }),

        actions: {
            changeRole: function changeRole(newRole) {
                this.set("model.role", newRole);
            },

            revoke: function revoke() {
                var self = this,
                    model = this.get("model"),
                    email = this.get("email");

                // reload the model to get the most up-to-date user information
                model.reload().then(function () {
                    if (model.get("invited")) {
                        model.destroyRecord().then(function () {
                            var notificationText = "Invitation revoked. (" + email + ")";
                            self.notifications.showSuccess(notificationText, false);
                        })["catch"](function (error) {
                            self.notifications.showAPIError(error);
                        });
                    } else {
                        // if the user is no longer marked as "invited", then show a warning and reload the route
                        self.get("target").send("reload");
                        self.notifications.showError("This user has already accepted the invitation.", { delayed: 500 });
                    }
                });
            },

            resend: function resend() {
                var self = this;

                this.get("model").resendInvite().then(function (result) {
                    var notificationText = "Invitation resent! (" + self.get("email") + ")";
                    // If sending the invitation email fails, the API will still return a status of 201
                    // but the user's status in the response object will be 'invited-pending'.
                    if (result.users[0].status === "invited-pending") {
                        self.notifications.showWarn("Invitation email was not sent.  Please try resending.");
                    } else {
                        self.get("model").set("status", result.users[0].status);
                        self.notifications.showSuccess(notificationText);
                    }
                })["catch"](function (error) {
                    self.notifications.showAPIError(error);
                });
            },

            save: function save() {
                var user = this.get("user"),
                    slugValue = this.get("slugValue"),
                    afterUpdateSlug = this.get("lastPromise"),
                    promise,
                    slugChanged,
                    self = this;

                if (user.get("slug") !== slugValue) {
                    slugChanged = true;
                    user.set("slug", slugValue);
                }

                promise = Ember['default'].RSVP.resolve(afterUpdateSlug).then(function () {
                    return user.save({ format: false });
                }).then(function (model) {
                    var currentPath, newPath;

                    self.notifications.showSuccess("Settings successfully saved.");

                    // If the user's slug has changed, change the URL and replace
                    // the history so refresh and back button still work
                    if (slugChanged) {
                        currentPath = window.history.state.path;

                        newPath = currentPath.split("/");
                        newPath[newPath.length - 2] = model.get("slug");
                        newPath = newPath.join("/");

                        window.history.replaceState({ path: newPath }, "", newPath);
                    }

                    return model;
                })["catch"](function (errors) {
                    self.notifications.showErrors(errors);
                });

                this.set("lastPromise", promise);
            },

            password: function password() {
                var user = this.get("user"),
                    self = this;

                if (user.get("isPasswordValid")) {
                    user.saveNewPassword().then(function (model) {
                        // Clear properties from view
                        user.setProperties({
                            password: "",
                            newPassword: "",
                            ne2Password: ""
                        });

                        self.notifications.showSuccess("Password updated.");

                        return model;
                    })["catch"](function (errors) {
                        self.notifications.showAPIError(errors);
                    });
                } else {
                    self.notifications.showErrors(user.get("passwordValidationErrors"));
                }
            },

            updateSlug: function updateSlug(newSlug) {
                var self = this,
                    afterSave = this.get("lastPromise"),
                    promise;

                promise = Ember['default'].RSVP.resolve(afterSave).then(function () {
                    var slug = self.get("model.slug");

                    newSlug = newSlug || slug;

                    newSlug = newSlug.trim();

                    // Ignore unchanged slugs or candidate slugs that are empty
                    if (!newSlug || slug === newSlug) {
                        self.set("slugValue", slug);

                        return;
                    }

                    return self.get("slugGenerator").generateSlug(newSlug).then(function (serverSlug) {
                        // If after getting the sanitized and unique slug back from the API
                        // we end up with a slug that matches the existing slug, abort the change
                        if (serverSlug === slug) {
                            return;
                        }

                        // Because the server transforms the candidate slug by stripping
                        // certain characters and appending a number onto the end of slugs
                        // to enforce uniqueness, there are cases where we can get back a
                        // candidate slug that is a duplicate of the original except for
                        // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

                        // get the last token out of the slug candidate and see if it's a number
                        var slugTokens = serverSlug.split("-"),
                            check = Number(slugTokens.pop());

                        // if the candidate slug is the same as the existing slug except
                        // for the incrementor then the existing slug should be used
                        if (isNumber['default'](check) && check > 0) {
                            if (slug === slugTokens.join("-") && serverSlug !== newSlug) {
                                self.set("slugValue", slug);

                                return;
                            }
                        }

                        self.set("slugValue", serverSlug);
                    });
                });

                this.set("lastPromise", promise);
            }
        }
    });

    exports['default'] = SettingsUserController;

});
define('ghost/controllers/setup', ['exports', 'ember', 'ghost/utils/ajax', 'ghost/mixins/validation-engine'], function (exports, Ember, ajax, ValidationEngine) {

    'use strict';

    var SetupController = Ember['default'].Controller.extend(ValidationEngine['default'], {
        blogTitle: null,
        name: null,
        email: null,
        password: null,
        submitting: false,

        // ValidationEngine settings
        validationType: "setup",

        actions: {
            setup: function setup() {
                var self = this,
                    data = self.getProperties("blogTitle", "name", "email", "password");

                self.notifications.closePassive();

                this.toggleProperty("submitting");
                this.validate({ format: false }).then(function () {
                    ajax['default']({
                        url: self.get("ghostPaths.url").api("authentication", "setup"),
                        type: "POST",
                        data: {
                            setup: [{
                                name: data.name,
                                email: data.email,
                                password: data.password,
                                blogTitle: data.blogTitle
                            }]
                        }
                    }).then(function () {
                        self.get("session").authenticate("simple-auth-authenticator:oauth2-password-grant", {
                            identification: self.get("email"),
                            password: self.get("password")
                        });
                    })["catch"](function (resp) {
                        self.toggleProperty("submitting");
                        self.notifications.showAPIError(resp);
                    });
                })["catch"](function (errors) {
                    self.toggleProperty("submitting");
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    exports['default'] = SetupController;

});
define('ghost/controllers/signin', ['exports', 'ember', 'ghost/mixins/validation-engine'], function (exports, Ember, ValidationEngine) {

    'use strict';

    var SigninController = Ember['default'].Controller.extend(SimpleAuth.AuthenticationControllerMixin, ValidationEngine['default'], {
        authenticator: "simple-auth-authenticator:oauth2-password-grant",
        forgotten: Ember['default'].inject.controller(),

        validationType: "signin",

        actions: {
            authenticate: function authenticate() {
                var model = this.get("model"),
                    data = model.getProperties("identification", "password");

                this._super(data)["catch"](function () {});
            },

            validateAndAuthenticate: function validateAndAuthenticate() {
                var self = this;

                // Manually trigger events for input fields, ensuring legacy compatibility with
                // browsers and password managers that don't send proper events on autofill
                $("#login").find("input").trigger("change");

                this.validate({ format: false }).then(function () {
                    self.notifications.closePassive();
                    self.send("authenticate");
                })["catch"](function (errors) {
                    self.notifications.showErrors(errors);
                });
            },

            forgotten: function forgotten() {
                if (this.get("model.identification")) {
                    return this.get("forgotten").send("doForgotten", { email: this.get("model.identification") }, false);
                }

                this.transitionToRoute("forgotten");
            }
        }
    });

    exports['default'] = SigninController;

    // if authentication fails a rejected promise will be returned.
    // it needs to be caught so it doesn't generate an exception in the console,
    // but it's actually "handled" by the sessionAuthenticationFailed action handler.

});
define('ghost/controllers/signup', ['exports', 'ember', 'ghost/utils/ajax', 'ghost/mixins/validation-engine'], function (exports, Ember, ajax, ValidationEngine) {

    'use strict';

    var SignupController = Ember['default'].Controller.extend(ValidationEngine['default'], {
        submitting: false,

        // ValidationEngine settings
        validationType: "signup",

        actions: {
            signup: function signup() {
                var self = this,
                    model = this.get("model"),
                    data = model.getProperties("name", "email", "password", "token");

                self.notifications.closePassive();

                this.toggleProperty("submitting");
                this.validate({ format: false }).then(function () {
                    ajax['default']({
                        url: self.get("ghostPaths.url").api("authentication", "invitation"),
                        type: "POST",
                        dataType: "json",
                        data: {
                            invitation: [{
                                name: data.name,
                                email: data.email,
                                password: data.password,
                                token: data.token
                            }]
                        }
                    }).then(function () {
                        self.get("session").authenticate("simple-auth-authenticator:oauth2-password-grant", {
                            identification: self.get("model.email"),
                            password: self.get("model.password")
                        });
                    }, function (resp) {
                        self.toggleProperty("submitting");
                        self.notifications.showAPIError(resp);
                    });
                }, function (errors) {
                    self.toggleProperty("submitting");
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    exports['default'] = SignupController;

});
define('ghost/helpers/gh-count-characters', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var countCharacters = Ember['default'].HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
        var el = document.createElement("span"),
            length,
            content;

        if (!arr || !arr.length) {
            return;
        }

        content = arr[0] || "";
        length = content.length;

        el.className = "word-count";

        if (length > 180) {
            el.style.color = "#E25440";
        } else {
            el.style.color = "#9E9D95";
        }

        el.innerHTML = 200 - length;

        return Ember['default'].String.htmlSafe(el.outerHTML);
    });

    exports['default'] = countCharacters;

});
define('ghost/helpers/gh-count-down-characters', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var countDownCharacters = Ember['default'].HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
        var el = document.createElement("span"),
            content,
            maxCharacters,
            length;

        if (!arr || arr.length < 2) {
            return;
        }

        content = arr[0] || "";
        maxCharacters = arr[1];
        length = content.length;

        el.className = "word-count";

        if (length > maxCharacters) {
            el.style.color = "#E25440";
        } else {
            el.style.color = "#9FBB58";
        }

        el.innerHTML = length;

        return Ember['default'].String.htmlSafe(el.outerHTML);
    });

    exports['default'] = countDownCharacters;

});
define('ghost/helpers/gh-count-words', ['exports', 'ember', 'ghost/utils/word-count'], function (exports, Ember, counter) {

    'use strict';

    var countWords = Ember['default'].HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
        if (!arr || !arr.length) {
            return;
        }

        var markdown, count;

        markdown = arr[0] || "";

        if (/^\s*$/.test(markdown)) {
            return "0 words";
        }

        count = counter['default'](markdown);

        return count + (count === 1 ? " word" : " words");
    });

    exports['default'] = countWords;

});
define('ghost/helpers/gh-format-html', ['exports', 'ember', 'ghost/utils/caja-sanitizers'], function (exports, Ember, cajaSanitizers) {

    'use strict';

    var formatHTML = Ember['default'].HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
        if (!arr || !arr.length) {
            return;
        }

        var escapedhtml = arr[0] || "";

        // replace script and iFrame
        escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "<pre class=\"js-embed-placeholder\">Embedded JavaScript</pre>");
        escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "<pre class=\"iframe-embed-placeholder\">Embedded iFrame</pre>");

        // sanitize HTML
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        escapedhtml = html_sanitize(escapedhtml, cajaSanitizers['default'].url, cajaSanitizers['default'].id);
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

        return Ember['default'].String.htmlSafe(escapedhtml);
    });

    exports['default'] = formatHTML;

});
define('ghost/helpers/gh-format-markdown', ['exports', 'ember', 'ghost/utils/caja-sanitizers'], function (exports, Ember, cajaSanitizers) {

    'use strict';

    var showdown, formatMarkdown;

    showdown = new Showdown.converter({ extensions: ["ghostimagepreview", "ghostgfm", "footnotes", "highlight"] });

    formatMarkdown = Ember['default'].HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
        if (!arr || !arr.length) {
            return;
        }

        var escapedhtml = "",
            markdown = arr[0] || "";

        // convert markdown to HTML
        escapedhtml = showdown.makeHtml(markdown);

        // replace script and iFrame
        escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "<pre class=\"js-embed-placeholder\">Embedded JavaScript</pre>");
        escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "<pre class=\"iframe-embed-placeholder\">Embedded iFrame</pre>");

        // sanitize html
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        escapedhtml = html_sanitize(escapedhtml, cajaSanitizers['default'].url, cajaSanitizers['default'].id);
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

        return Ember['default'].String.htmlSafe(escapedhtml);
    });

    exports['default'] = formatMarkdown;

});
define('ghost/helpers/gh-format-timeago', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var formatTimeago = Ember['default'].HTMLBars.makeBoundHelper(function (arr /* hashParams */) {
        if (!arr || !arr.length) {
            return;
        }

        var timeago = arr[0];

        return moment(timeago).fromNow();
        // stefanpenner says cool for small number of timeagos.
        // For large numbers moment sucks => single Ember.Object based clock better
        // https://github.com/manuelmitasch/ghost-admin-ember-demo/commit/fba3ab0a59238290c85d4fa0d7c6ed1be2a8a82e#commitcomment-5396524
    });

    exports['default'] = formatTimeago;

});
define('ghost/helpers/gh-path', ['exports', 'ember', 'ghost/utils/ghost-paths'], function (exports, Ember, ghostPaths) {

    'use strict';

    function ghostPathsHelper(path, url) {
        var base,
            argsLength = arguments.length,
            paths = ghostPaths['default']();

        // function is always invoked with at least one parameter, so if
        // arguments.length is 1 there were 0 arguments passed in explicitly
        if (argsLength === 1) {
            path = "blog";
        } else if (argsLength === 2 && !/^(blog|admin|api)$/.test(path)) {
            url = path;
            path = "blog";
        }

        switch (path.toString()) {
            case "blog":
                base = paths.blogRoot;
                break;
            case "admin":
                base = paths.adminRoot;
                break;
            case "api":
                base = paths.apiRoot;
                break;
            default:
                base = paths.blogRoot;
                break;
        }

        // handle leading and trailing slashes

        base = base[base.length - 1] !== "/" ? base + "/" : base;

        if (url && url.length > 0) {
            if (url[0] === "/") {
                url = url.substr(1);
            }

            base = base + url;
        }

        return Ember['default'].String.htmlSafe(base);
    }

    exports['default'] = ghostPathsHelper;

});
define('ghost/initializers/app-version', ['exports', 'ghost/config/environment', 'ember'], function (exports, config, Ember) {

  'use strict';

  var classify = Ember['default'].String.classify;
  var registered = false;

  exports['default'] = {
    name: "App Version",
    initialize: function initialize(container, application) {
      if (!registered) {
        var appName = classify(application.toString());
        Ember['default'].libraries.register(appName, config['default'].APP.version);
        registered = true;
      }
    }
  };

});
define('ghost/initializers/authentication', ['exports', 'ember', 'ghost/utils/ghost-paths'], function (exports, Ember, ghostPaths) {

    'use strict';

    var Ghost, AuthenticationInitializer;

    Ghost = ghostPaths['default']();

    AuthenticationInitializer = {
        name: "authentication",
        before: "simple-auth",
        after: "registerTrailingLocationHistory",

        initialize: function initialize(container) {
            window.ENV = window.ENV || {};

            window.ENV["simple-auth"] = {
                authenticationRoute: "signin",
                routeAfterAuthentication: "posts",
                authorizer: "simple-auth-authorizer:oauth2-bearer",
                localStorageKey: "ghost" + (Ghost.subdir.indexOf("/") === 0 ? "-" + Ghost.subdir.substr(1) : "") + ":session"
            };

            window.ENV["simple-auth-oauth2"] = {
                serverTokenEndpoint: Ghost.apiRoot + "/authentication/token",
                serverTokenRevocationEndpoint: Ghost.apiRoot + "/authentication/revoke",
                refreshAccessTokens: true
            };

            SimpleAuth.Session.reopen({
                user: Ember['default'].computed(function () {
                    return container.lookup("store:main").find("user", "me");
                })
            });

            SimpleAuth.Authenticators.OAuth2.reopen({
                makeRequest: function makeRequest(url, data) {
                    data.client_id = "ghost-admin";
                    return this._super(url, data);
                }
            });
        }
    };

    exports['default'] = AuthenticationInitializer;

});
define('ghost/initializers/dropdown', ['exports', 'ghost/utils/dropdown-service'], function (exports, DropdownService) {

    'use strict';

    var dropdownInitializer = {
        name: "dropdown",

        initialize: function initialize(container, application) {
            application.register("dropdown:service", DropdownService['default']);

            // Inject dropdowns
            application.inject("component:gh-dropdown", "dropdown", "dropdown:service");
            application.inject("component:gh-dropdown-button", "dropdown", "dropdown:service");
            application.inject("controller:modals.delete-post", "dropdown", "dropdown:service");
            application.inject("controller:modals.transfer-owner", "dropdown", "dropdown:service");
            application.inject("route:application", "dropdown", "dropdown:service");

            // Inject popovers
            application.inject("component:gh-popover", "dropdown", "dropdown:service");
            application.inject("component:gh-popover-button", "dropdown", "dropdown:service");
            application.inject("route:application", "dropdown", "dropdown:service");
        }
    };

    exports['default'] = dropdownInitializer;

});
define('ghost/initializers/export-application-global', ['exports', 'ember', 'ghost/config/environment'], function (exports, Ember, config) {

  'use strict';

  exports.initialize = initialize;

  function initialize(container, application) {
    var classifiedName = Ember['default'].String.classify(config['default'].modulePrefix);

    if (config['default'].exportApplicationGlobal && !window[classifiedName]) {
      window[classifiedName] = application;
    }
  }

  ;

  exports['default'] = {
    name: "export-application-global",

    initialize: initialize
  };

});
define('ghost/initializers/ghost-config', ['exports', 'ghost/utils/config-parser'], function (exports, getConfig) {

    'use strict';

    var ConfigInitializer = {
        name: "config",

        initialize: function initialize(container, application) {
            var config = getConfig['default']();
            application.register("ghost:config", config, { instantiate: false });

            application.inject("route", "config", "ghost:config");
            application.inject("model:post", "config", "ghost:config");
            application.inject("controller", "config", "ghost:config");
            application.inject("component", "config", "ghost:config");
        }
    };

    exports['default'] = ConfigInitializer;

});
define('ghost/initializers/ghost-paths', ['exports', 'ghost/utils/ghost-paths'], function (exports, ghostPaths) {

    'use strict';

    var ghostPathsInitializer = {
        name: "ghost-paths",
        after: "store",

        initialize: function initialize(container, application) {
            application.register("ghost:paths", ghostPaths['default'](), { instantiate: false });

            application.inject("route", "ghostPaths", "ghost:paths");
            application.inject("model", "ghostPaths", "ghost:paths");
            application.inject("controller", "ghostPaths", "ghost:paths");
        }
    };

    exports['default'] = ghostPathsInitializer;

});
define('ghost/initializers/notifications', ['exports', 'ghost/utils/notifications'], function (exports, Notifications) {

    'use strict';

    var injectNotificationsInitializer = {
        name: "injectNotifications",
        before: "authentication",

        initialize: function initialize(container, application) {
            application.register("notifications:main", Notifications['default']);

            application.inject("controller", "notifications", "notifications:main");
            application.inject("component", "notifications", "notifications:main");
            application.inject("router", "notifications", "notifications:main");
            application.inject("route", "notifications", "notifications:main");
        }
    };

    exports['default'] = injectNotificationsInitializer;

});
define('ghost/initializers/store-injector', ['exports'], function (exports) {

    'use strict';

    var StoreInjector = {
        name: "store-injector",
        after: "store",

        initialize: function initialize(container, application) {
            application.inject("component:gh-role-selector", "store", "store:main");
        }
    };

    exports['default'] = StoreInjector;

});
define('ghost/initializers/trailing-history', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var trailingHistory, registerTrailingLocationHistory;

    trailingHistory = Ember['default'].HistoryLocation.extend({
        formatURL: function formatURL() {
            // jscs: disable
            return this._super.apply(this, arguments).replace(/\/?$/, "/");
            // jscs: enable
        }
    });

    registerTrailingLocationHistory = {
        name: "registerTrailingLocationHistory",

        initialize: function initialize(container, application) {
            application.register("location:trailing-history", trailingHistory);
        }
    };

    exports['default'] = registerTrailingLocationHistory;

});
define('ghost/mixins/body-event-listener', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var BodyEventListener = Ember['default'].Mixin.create({
        bodyElementSelector: "html",
        bodyClick: Ember['default'].K,

        init: function init() {
            this._super();

            return Ember['default'].run.next(this, this._setupDocumentHandlers);
        },

        willDestroy: function willDestroy() {
            this._super();

            return this._removeDocumentHandlers();
        },

        _setupDocumentHandlers: function _setupDocumentHandlers() {
            if (this._clickHandler) {
                return;
            }

            var self = this;

            this._clickHandler = function () {
                return self.bodyClick();
            };

            return $(this.get("bodyElementSelector")).on("click", this._clickHandler);
        },

        _removeDocumentHandlers: function _removeDocumentHandlers() {
            $(this.get("bodyElementSelector")).off("click", this._clickHandler);
            this._clickHandler = null;
        },

        // http://stackoverflow.com/questions/152975/how-to-detect-a-click-outside-an-element
        click: function click(event) {
            return event.stopPropagation();
        }
    });

    exports['default'] = BodyEventListener;

});
define('ghost/mixins/current-user-settings', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var CurrentUserSettings = Ember['default'].Mixin.create({
        transitionAuthor: function transitionAuthor() {
            var self = this;

            return function (user) {
                if (user.get("isAuthor")) {
                    return self.transitionTo("settings.users.user", user);
                }

                return user;
            };
        },

        transitionEditor: function transitionEditor() {
            var self = this;

            return function (user) {
                if (user.get("isEditor")) {
                    return self.transitionTo("settings.users");
                }

                return user;
            };
        }
    });

    exports['default'] = CurrentUserSettings;

});
define('ghost/mixins/dropdown-mixin', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  var DropdownMixin = Ember['default'].Mixin.create(Ember['default'].Evented, {
      classNameBindings: ["isOpen:open:closed"],
      isOpen: false,

      click: function click(event) {
          this._super(event);

          return event.stopPropagation();
      }
  });

  exports['default'] = DropdownMixin;

});
define('ghost/mixins/ed-editor-api', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var EditorAPI = Ember['default'].Mixin.create({
        /**
         * Get Value
         *
         * Get the full contents of the textarea
         *
         * @returns {String}
         */
        getValue: function getValue() {
            return this.$().val();
        },

        /**
         * Get Selection
         *
         * Return the currently selected text from the textarea
         *
         * @returns {Selection}
         */
        getSelection: function getSelection() {
            return this.$().getSelection();
        },

        /**
         * Get Line To Cursor
         *
         * Fetch the string of characters from the start of the given line up to the cursor
         * @returns {{text: string, start: number}}
         */
        getLineToCursor: function getLineToCursor() {
            var selection = this.$().getSelection(),
                value = this.getValue(),
                lineStart;

            // Normalise newlines
            value = value.replace("\r\n", "\n");

            // We want to look at the characters behind the cursor
            lineStart = value.lastIndexOf("\n", selection.start - 1) + 1;

            return {
                text: value.substring(lineStart, selection.start),
                start: lineStart
            };
        },

        /**
         * Get Line
         *
         * Return the string of characters for the line the cursor is currently on
         *
         * @returns {{text: string, start: number, end: number}}
         */
        getLine: function getLine() {
            var selection = this.$().getSelection(),
                value = this.getValue(),
                lineStart,
                lineEnd;

            // Normalise newlines
            value = value.replace("\r\n", "\n");

            // We want to look at the characters behind the cursor
            lineStart = value.lastIndexOf("\n", selection.start - 1) + 1;
            lineEnd = value.indexOf("\n", selection.start);
            lineEnd = lineEnd === -1 ? value.length - 1 : lineEnd;

            return {
                // jscs:disable
                text: value.substring(lineStart, lineEnd).replace(/^\n/, ""),
                // jscs:enable
                start: lineStart,
                end: lineEnd
            };
        },

        /**
         * Set Selection
         *
         * Set the section of text in the textarea that should be selected by the cursor
         *
         * @param {number} start
         * @param {number} end
         */
        setSelection: function setSelection(start, end) {
            var $textarea = this.$();

            if (start === "end") {
                start = $textarea.val().length;
            }

            end = end || start;

            $textarea.setSelection(start, end);
        },

        /**
         * Replace Selection
         *
         * @param {String} replacement - the string to replace with
         * @param {number} replacementStart - where to start replacing
         * @param {number} [replacementEnd] - when to stop replacing, defaults to replacementStart
         * @param {String|boolean|Object} [cursorPosition]  - where to put the cursor after replacing
         *
         * Cursor position after replacement defaults to the end of the replacement.
         * Providing selectionStart only will cause the cursor to be placed there, or alternatively a range can be selected
         * by providing selectionEnd.
         */
        replaceSelection: function replaceSelection(replacement, replacementStart, replacementEnd, cursorPosition) {
            var $textarea = this.$();

            cursorPosition = cursorPosition || "collapseToEnd";
            replacementEnd = replacementEnd || replacementStart;

            $textarea.setSelection(replacementStart, replacementEnd);

            if (["select", "collapseToStart", "collapseToEnd"].indexOf(cursorPosition) !== -1) {
                $textarea.replaceSelectedText(replacement, cursorPosition);
            } else {
                $textarea.replaceSelectedText(replacement);
                if (cursorPosition.hasOwnProperty("start")) {
                    $textarea.setSelection(cursorPosition.start, cursorPosition.end);
                } else {
                    $textarea.setSelection(cursorPosition, cursorPosition);
                }
            }

            $textarea.focus();
            // Tell the editor it has changed, as programmatic replacements won't trigger this automatically
            this.sendAction("onChange");
        }
    });

    exports['default'] = EditorAPI;

});
define('ghost/mixins/ed-editor-scroll', ['exports', 'ember', 'ghost/utils/set-scroll-classname'], function (exports, Ember, setScrollClassName) {

    'use strict';

    var EditorScroll = Ember['default'].Mixin.create({
        /**
         * Determine if the cursor is at the end of the textarea
         */
        isCursorAtEnd: function isCursorAtEnd() {
            var selection = this.$().getSelection(),
                value = this.getValue(),
                linesAtEnd = 3,
                stringAfterCursor,
                match;

            stringAfterCursor = value.substring(selection.end);
            /* jscs: disable */
            match = stringAfterCursor.match(/\n/g);
            /* jscs: enable */

            if (!match || match.length < linesAtEnd) {
                return true;
            }

            return false;
        },

        /**
         * Build an object that represents the scroll state
         */
        getScrollInfo: function getScrollInfo() {
            var scroller = this.get("element"),
                scrollInfo = {
                top: scroller.scrollTop,
                height: scroller.scrollHeight,
                clientHeight: scroller.clientHeight,
                diff: scroller.scrollHeight - scroller.clientHeight,
                padding: 50,
                isCursorAtEnd: this.isCursorAtEnd()
            };

            return scrollInfo;
        },

        /**
         * Calculate if we're within scrollInfo.padding of the end of the document, and scroll the rest of the way
         */
        adjustScrollPosition: function adjustScrollPosition() {
            // If we're receiving change events from the end of the document, i.e the user is typing-at-the-end, update the
            // scroll position to ensure both panels stay in view and in sync
            var scrollInfo = this.getScrollInfo();
            if (scrollInfo.isCursorAtEnd && scrollInfo.diff >= scrollInfo.top && scrollInfo.diff < scrollInfo.top + scrollInfo.padding) {
                scrollInfo.top += scrollInfo.padding;
                // Scroll the left pane
                this.$().scrollTop(scrollInfo.top);
            }
        },

        /**
         * Send the scrollInfo for scrollEvents to the view so that the preview pane can be synced
         */
        scrollHandler: function scrollHandler() {
            this.set("scrollThrottle", Ember['default'].run.throttle(this, function () {
                this.set("scrollInfo", this.getScrollInfo());
            }, 10));
        },

        /**
         * once the element is in the DOM bind to the events which control scroll behaviour
         */
        attachScrollHandlers: (function () {
            var $el = this.$();

            $el.on("keypress", Ember['default'].run.bind(this, this.adjustScrollPosition));

            $el.on("scroll", Ember['default'].run.bind(this, this.scrollHandler));
            $el.on("scroll", Ember['default'].run.bind($el, setScrollClassName['default'], {
                target: Ember['default'].$(".js-entry-markdown"),
                offset: 10
            }));
        }).on("didInsertElement"),

        /**
         * once the element is in the DOM unbind from the events which control scroll behaviour
         */
        detachScrollHandlers: (function () {
            this.$().off("keypress");
            this.$().off("scroll");
            Ember['default'].run.cancel(this.get("scrollThrottle"));
        }).on("willDestroyElement")
    });

    exports['default'] = EditorScroll;

});
define('ghost/mixins/ed-editor-shortcuts', ['exports', 'ember', 'ghost/utils/titleize'], function (exports, Ember, titleize) {

    'use strict';

    /* global moment, Showdown */
    var simpleShortcutSyntax, shortcuts, EditorShortcuts;

    // Used for simple, noncomputational replace-and-go! shortcuts.
    // See default case in shortcut function below.
    simpleShortcutSyntax = {
        bold: {
            regex: "**|**",
            cursor: "|"
        },
        italic: {
            regex: "*|*",
            cursor: "|"

        },
        strike: {
            regex: "~~|~~",
            cursor: "|"
        },
        code: {
            regex: "`|`",
            cursor: "|"
        },
        blockquote: {
            regex: "> |",
            cursor: "|",
            newline: true
        },
        list: {
            regex: "* |",
            cursor: "|",
            newline: true
        },
        link: {
            regex: "[|](http://)",
            cursor: "http://"
        },
        image: {
            regex: "![|](http://)",
            cursor: "http://",
            newline: true
        }
    };

    shortcuts = {
        simple: function simple(type, replacement, selection, line) {
            var shortcut,
                startIndex = 0;

            if (simpleShortcutSyntax.hasOwnProperty(type)) {
                shortcut = simpleShortcutSyntax[type];
                // insert the markdown
                replacement.text = shortcut.regex.replace("|", selection.text);

                // add a newline if needed
                if (shortcut.newline && line.text !== "") {
                    startIndex = 1;
                    replacement.text = "\n" + replacement.text;
                }

                // handle cursor position
                if (selection.text === "" && shortcut.cursor === "|") {
                    // the cursor should go where | was
                    replacement.position = startIndex + replacement.start + shortcut.regex.indexOf(shortcut.cursor);
                } else if (shortcut.cursor !== "|") {
                    // the cursor should select the string which matches shortcut.cursor
                    replacement.position = {
                        start: replacement.start + replacement.text.indexOf(shortcut.cursor)
                    };
                    replacement.position.end = replacement.position.start + shortcut.cursor.length;
                }
            }

            return replacement;
        },
        cycleHeaderLevel: function cycleHeaderLevel(replacement, line) {
            // jscs:disable
            var match = line.text.match(/^#+/),

            // jscs:enable
            currentHeaderLevel,
                hashPrefix;

            if (!match) {
                currentHeaderLevel = 1;
            } else {
                currentHeaderLevel = match[0].length;
            }

            if (currentHeaderLevel > 2) {
                currentHeaderLevel = 1;
            }

            hashPrefix = new Array(currentHeaderLevel + 2).join("#");

            // jscs:disable
            replacement.text = hashPrefix + " " + line.text.replace(/^#* /, "");
            // jscs:enable

            replacement.start = line.start;
            replacement.end = line.end;

            return replacement;
        },
        copyHTML: function copyHTML(editor, selection) {
            var converter = new Showdown.converter(),
                generatedHTML;

            if (selection.text) {
                generatedHTML = converter.makeHtml(selection.text);
            } else {
                generatedHTML = converter.makeHtml(editor.getValue());
            }

            // Talk to the editor
            editor.sendAction("openModal", "copy-html", { generatedHTML: generatedHTML });
        },
        currentDate: function currentDate(replacement) {
            replacement.text = moment(new Date()).format("D MMMM YYYY");
            return replacement;
        },
        uppercase: function uppercase(replacement, selection) {
            replacement.text = selection.text.toLocaleUpperCase();
            return replacement;
        },
        lowercase: function lowercase(replacement, selection) {
            replacement.text = selection.text.toLocaleLowerCase();
            return replacement;
        },
        titlecase: function titlecase(replacement, selection) {
            replacement.text = titleize['default'](selection.text);
            return replacement;
        }
    };

    EditorShortcuts = Ember['default'].Mixin.create({
        shortcut: function shortcut(type) {
            var selection = this.getSelection(),
                replacement = {
                start: selection.start,
                end: selection.end,
                position: "collapseToEnd"
            };

            switch (type) {
                // This shortcut is special as it needs to send an action
                case "copyHTML":
                    shortcuts.copyHTML(this, selection);
                    break;
                case "cycleHeaderLevel":
                    replacement = shortcuts.cycleHeaderLevel(replacement, this.getLine());
                    break;
                // These shortcuts all process the basic information
                case "currentDate":
                case "uppercase":
                case "lowercase":
                case "titlecase":
                    replacement = shortcuts[type](replacement, selection, this.getLineToCursor());
                    break;
                // All the of basic formatting shortcuts work with a regex
                default:
                    replacement = shortcuts.simple(type, replacement, selection, this.getLineToCursor());
            }

            if (replacement.text) {
                this.replaceSelection(replacement.text, replacement.start, replacement.end, replacement.position);
            }
        }
    });

    exports['default'] = EditorShortcuts;

});
define('ghost/mixins/editor-base-controller', ['exports', 'ember', 'ghost/models/post', 'ghost/utils/bound-one-way', 'ghost/utils/ed-image-manager'], function (exports, Ember, PostModel, boundOneWay, imageManager) {

    'use strict';

    var watchedProps, EditorControllerMixin;

    // this array will hold properties we need to watch
    // to know if the model has been changed (`controller.isDirty`)
    watchedProps = ["model.scratch", "model.titleScratch", "model.isDirty", "model.tags.[]"];

    PostModel['default'].eachAttribute(function (name) {
        watchedProps.push("model." + name);
    });

    EditorControllerMixin = Ember['default'].Mixin.create({
        needs: ["post-tags-input", "post-settings-menu"],

        autoSaveId: null,
        timedSaveId: null,
        editor: null,

        init: function init() {
            var self = this;

            this._super();

            window.onbeforeunload = function () {
                return self.get("isDirty") ? self.unloadDirtyMessage() : null;
            };
        },
        autoSave: (function () {
            // Don't save just because we swapped out models
            if (this.get("model.isDraft") && !this.get("model.isNew")) {
                var autoSaveId, timedSaveId, saveOptions;

                saveOptions = {
                    silent: true,
                    disableNProgress: true,
                    backgroundSave: true
                };

                timedSaveId = Ember['default'].run.throttle(this, "send", "save", saveOptions, 60000, false);
                this.set("timedSaveId", timedSaveId);

                autoSaveId = Ember['default'].run.debounce(this, "send", "save", saveOptions, 3000);
                this.set("autoSaveId", autoSaveId);
            }
        }).observes("model.scratch"),

        /**
         * By default, a post will not change its publish state.
         * Only with a user-set value (via setSaveType action)
         * can the post's status change.
         */
        willPublish: boundOneWay['default']("model.isPublished"),

        // Make sure editor starts with markdown shown
        isPreview: false,

        // set by the editor route and `isDirty`. useful when checking
        // whether the number of tags has changed for `isDirty`.
        previousTagNames: null,

        tagNames: Ember['default'].computed("model.tags.@each.name", function () {
            return this.get("model.tags").mapBy("name");
        }),

        postOrPage: Ember['default'].computed("model.page", function () {
            return this.get("model.page") ? "Page" : "Post";
        }),

        // compares previousTagNames to tagNames
        tagNamesEqual: function tagNamesEqual() {
            var tagNames = this.get("tagNames"),
                previousTagNames = this.get("previousTagNames"),
                hashCurrent,
                hashPrevious;

            // beware! even if they have the same length,
            // that doesn't mean they're the same.
            if (tagNames.length !== previousTagNames.length) {
                return false;
            }

            // instead of comparing with slow, nested for loops,
            // perform join on each array and compare the strings
            hashCurrent = tagNames.join("");
            hashPrevious = previousTagNames.join("");

            return hashCurrent === hashPrevious;
        },

        // a hook created in editor-base-route's setupController
        modelSaved: function modelSaved() {
            var model = this.get("model");

            // safer to updateTags on save in one place
            // rather than in all other places save is called
            model.updateTags();

            // set previousTagNames to current tagNames for isDirty check
            this.set("previousTagNames", this.get("tagNames"));

            // `updateTags` triggers `isDirty => true`.
            // for a saved model it would otherwise be false.

            // if the two "scratch" properties (title and content) match the model, then
            // it's ok to set isDirty to false
            if (model.get("titleScratch") === model.get("title") && model.get("scratch") === model.get("markdown")) {
                this.set("isDirty", false);
            }
        },

        // an ugly hack, but necessary to watch all the model's properties
        // and more, without having to be explicit and do it manually
        isDirty: Ember['default'].computed.apply(Ember['default'], watchedProps.concat(function (key, value) {
            if (arguments.length > 1) {
                return value;
            }

            var model = this.get("model"),
                markdown = model.get("markdown"),
                title = model.get("title"),
                titleScratch = model.get("titleScratch"),
                scratch = this.get("editor").getValue(),
                changedAttributes;

            if (!this.tagNamesEqual()) {
                return true;
            }

            if (titleScratch !== title) {
                return true;
            }

            // since `scratch` is not model property, we need to check
            // it explicitly against the model's markdown attribute
            if (markdown !== scratch) {
                return true;
            }

            // if the Adapter failed to save the model isError will be true
            // and we should consider the model still dirty.
            if (model.get("isError")) {
                return true;
            }

            // models created on the client always return `isDirty: true`,
            // so we need to see which properties have actually changed.
            if (model.get("isNew")) {
                changedAttributes = Ember['default'].keys(model.changedAttributes());

                if (changedAttributes.length) {
                    return true;
                }

                return false;
            }

            // even though we use the `scratch` prop to show edits,
            // which does *not* change the model's `isDirty` property,
            // `isDirty` will tell us if the other props have changed,
            // as long as the model is not new (model.isNew === false).
            return model.get("isDirty");
        })),

        // used on window.onbeforeunload
        unloadDirtyMessage: function unloadDirtyMessage() {
            return "==============================\n\n" + "Hey there! It looks like you're in the middle of writing" + " something and you haven't saved all of your content." + "\n\nSave before you go!\n\n" + "==============================";
        },

        // TODO: This has to be moved to the I18n localization file.
        // This structure is supposed to be close to the i18n-localization which will be used soon.
        messageMap: {
            errors: {
                post: {
                    published: {
                        published: "Update failed.",
                        draft: "Saving failed."
                    },
                    draft: {
                        published: "Publish failed.",
                        draft: "Saving failed."
                    }

                }
            },

            success: {
                post: {
                    published: {
                        published: "Updated.",
                        draft: "Saved."
                    },
                    draft: {
                        published: "Published!",
                        draft: "Saved."
                    }
                }
            }
        },

        showSaveNotification: function showSaveNotification(prevStatus, status, delay) {
            var message = this.messageMap.success.post[prevStatus][status],
                path = this.get("model.absoluteUrl"),
                type = this.get("postOrPage");

            if (status === "published") {
                message += "&nbsp;<a href=\"" + path + "\">View " + type + "</a>";
            }
            this.notifications.showSuccess(message.htmlSafe(), { delayed: delay });
        },

        showErrorNotification: function showErrorNotification(prevStatus, status, errors, delay) {
            var message = this.messageMap.errors.post[prevStatus][status],
                error = errors && errors[0] && errors[0].message || "Unknown Error";

            message += "<br />" + error;

            this.notifications.showError(message.htmlSafe(), { delayed: delay });
        },

        shouldFocusTitle: Ember['default'].computed.alias("model.isNew"),
        shouldFocusEditor: Ember['default'].computed.not("model.isNew"),

        actions: {
            save: function save(options) {
                var status,
                    prevStatus = this.get("model.status"),
                    isNew = this.get("model.isNew"),
                    autoSaveId = this.get("autoSaveId"),
                    timedSaveId = this.get("timedSaveId"),
                    self = this,
                    psmController = this.get("controllers.post-settings-menu"),
                    promise;

                options = options || {};

                if (options.backgroundSave) {
                    // do not allow a post's status to be set to published by a background save
                    status = "draft";
                } else {
                    status = this.get("willPublish") ? "published" : "draft";
                }

                if (autoSaveId) {
                    Ember['default'].run.cancel(autoSaveId);
                    this.set("autoSaveId", null);
                }

                if (timedSaveId) {
                    Ember['default'].run.cancel(timedSaveId);
                    this.set("timedSaveId", null);
                }

                self.notifications.closePassive();

                // ensure an incomplete tag is finalised before save
                this.get("controllers.post-tags-input").send("addNewTag");

                // Set the properties that are indirected
                // set markdown equal to what's in the editor, minus the image markers.
                this.set("model.markdown", this.get("editor").getValue());
                this.set("model.status", status);

                // Set a default title
                if (!this.get("model.titleScratch").trim()) {
                    this.set("model.titleScratch", "(Untitled)");
                }

                this.set("model.title", this.get("model.titleScratch"));
                this.set("model.meta_title", psmController.get("metaTitleScratch"));
                this.set("model.meta_description", psmController.get("metaDescriptionScratch"));

                if (!this.get("model.slug")) {
                    // Cancel any pending slug generation that may still be queued in the
                    // run loop because we need to run it before the post is saved.
                    Ember['default'].run.cancel(psmController.get("debounceId"));

                    psmController.generateAndSetSlug("model.slug");
                }

                promise = Ember['default'].RSVP.resolve(psmController.get("lastPromise")).then(function () {
                    return self.get("model").save(options).then(function (model) {
                        if (!options.silent) {
                            self.showSaveNotification(prevStatus, model.get("status"), isNew ? true : false);
                        }

                        return model;
                    });
                })["catch"](function (errors) {
                    if (!options.silent) {
                        self.showErrorNotification(prevStatus, self.get("model.status"), errors);
                    }

                    self.set("model.status", prevStatus);

                    return self.get("model");
                });

                psmController.set("lastPromise", promise);

                return promise;
            },

            setSaveType: function setSaveType(newType) {
                if (newType === "publish") {
                    this.set("willPublish", true);
                } else if (newType === "draft") {
                    this.set("willPublish", false);
                } else {
                    console.warn("Received invalid save type; ignoring.");
                }
            },

            // set from a `sendAction` on the gh-ed-editor component,
            // so that we get a reference for handling uploads.
            setEditor: function setEditor(editor) {
                this.set("editor", editor);
            },

            // fired from the gh-ed-preview component when an image upload starts
            disableEditor: function disableEditor() {
                this.get("editor").disable();
            },

            // fired from the gh-ed-preview component when an image upload finishes
            enableEditor: function enableEditor() {
                this.get("editor").enable();
            },

            // Match the uploaded file to a line in the editor, and update that line with a path reference
            // ensuring that everything ends up in the correct place and format.
            handleImgUpload: function handleImgUpload(e, resultSrc) {
                var editor = this.get("editor"),
                    editorValue = editor.getValue(),
                    replacement = imageManager['default'].getSrcRange(editorValue, e.target),
                    cursorPosition;

                if (replacement) {
                    cursorPosition = replacement.start + resultSrc.length + 1;
                    if (replacement.needsParens) {
                        resultSrc = "(" + resultSrc + ")";
                    }
                    editor.replaceSelection(resultSrc, replacement.start, replacement.end, cursorPosition);
                }
            },

            togglePreview: function togglePreview(preview) {
                this.set("isPreview", preview);
            },

            autoSaveNew: function autoSaveNew() {
                if (this.get("model.isNew")) {
                    this.send("save", { silent: true, disableNProgress: true, backgroundSave: true });
                }
            }
        }
    });

    exports['default'] = EditorControllerMixin;

});
define('ghost/mixins/editor-base-route', ['exports', 'ember', 'ghost/mixins/shortcuts-route', 'ghost/mixins/style-body', 'ghost/mixins/loading-indicator', 'ghost/utils/editor-shortcuts'], function (exports, Ember, ShortcutsRoute, styleBody, loadingIndicator, editorShortcuts) {

    'use strict';

    var EditorBaseRoute = Ember['default'].Mixin.create(styleBody['default'], ShortcutsRoute['default'], loadingIndicator['default'], {
        classNames: ["editor"],

        actions: {
            save: function save() {
                this.get("controller").send("save");
            },

            publish: function publish() {
                var controller = this.get("controller");

                controller.send("setSaveType", "publish");
                controller.send("save");
            },

            toggleZenMode: function toggleZenMode() {
                Ember['default'].$("body").toggleClass("zen");
            },

            // The actual functionality is implemented in utils/ed-editor-shortcuts
            editorShortcut: function editorShortcut(options) {
                // Only fire editor shortcuts when the editor has focus.
                if (this.get("controller.editor").$().is(":focus")) {
                    this.get("controller.editor").shortcut(options.type);
                }
            },

            willTransition: function willTransition(transition) {
                var controller = this.get("controller"),
                    scratch = controller.get("model.scratch"),
                    controllerIsDirty = controller.get("isDirty"),
                    model = controller.get("model"),
                    state = model.getProperties("isDeleted", "isSaving", "isDirty", "isNew"),
                    fromNewToEdit,
                    deletedWithoutChanges;

                fromNewToEdit = this.get("routeName") === "editor.new" && transition.targetName === "editor.edit" && transition.intent.contexts && transition.intent.contexts[0] && transition.intent.contexts[0].id === model.get("id");

                deletedWithoutChanges = state.isDeleted && (state.isSaving || !state.isDirty);

                this.send("closeSettingsMenu");

                if (!fromNewToEdit && !deletedWithoutChanges && controllerIsDirty) {
                    transition.abort();
                    this.send("openModal", "leave-editor", [controller, transition]);
                    return;
                }

                // The controller may hold model state that will be lost in the transition,
                // so we need to apply it now.
                if (fromNewToEdit && controllerIsDirty) {
                    if (scratch !== model.get("markdown")) {
                        model.set("markdown", scratch);
                    }
                }

                if (state.isNew) {
                    model.deleteRecord();
                }

                // since the transition is now certain to complete..
                window.onbeforeunload = null;

                // remove model-related listeners created in editor-base-route
                this.detachModelHooks(controller, model);
            }
        },

        renderTemplate: function renderTemplate(controller, model) {
            this._super(controller, model);

            this.render("post-settings-menu", {
                into: "application",
                outlet: "settings-menu",
                model: model
            });
        },

        shortcuts: editorShortcuts['default'],

        attachModelHooks: function attachModelHooks(controller, model) {
            // this will allow us to track when the model is saved and update the controller
            // so that we can be sure controller.isDirty is correct, without having to update the
            // controller on each instance of `model.save()`.
            //
            // another reason we can't do this on `model.save().then()` is because the post-settings-menu
            // also saves the model, and passing messages is difficult because we have two
            // types of editor controllers, and the PSM also exists on the posts.post route.
            //
            // The reason we can't just keep this functionality in the editor controller is
            // because we need to remove these handlers on `willTransition` in the editor route.
            model.on("didCreate", controller, controller.get("modelSaved"));
            model.on("didUpdate", controller, controller.get("modelSaved"));
        },

        detachModelHooks: function detachModelHooks(controller, model) {
            model.off("didCreate", controller, controller.get("modelSaved"));
            model.off("didUpdate", controller, controller.get("modelSaved"));
        },

        setupController: function setupController(controller, model) {
            model.set("scratch", model.get("markdown"));
            model.set("titleScratch", model.get("title"));

            this._super(controller, model);
            var tags = model.get("tags");

            if (tags) {
                // used to check if anything has changed in the editor
                controller.set("previousTagNames", tags.mapBy("name"));
            } else {
                controller.set("previousTagNames", []);
            }

            // attach model-related listeners created in editor-base-route
            this.attachModelHooks(controller, model);
        }
    });

    exports['default'] = EditorBaseRoute;

});
define('ghost/mixins/editor-base-view', ['exports', 'ember', 'ghost/utils/set-scroll-classname'], function (exports, Ember, setScrollClassName) {

    'use strict';

    var EditorViewMixin = Ember['default'].Mixin.create({
        // create a hook for jQuery logic that will run after
        // a view and all child views have been rendered,
        // since didInsertElement runs only when the view's el
        // has rendered, and not necessarily all child views.
        //
        // http://mavilein.github.io/javascript/2013/08/01/Ember-JS-After-Render-Event/
        // http://emberjs.com/api/classes/Ember.run.html#method_next
        scheduleAfterRender: (function () {
            Ember['default'].run.scheduleOnce("afterRender", this, this.afterRenderEvent);
        }).on("didInsertElement"),

        // all child views will have rendered when this fires
        afterRenderEvent: function afterRenderEvent() {
            var $previewViewPort = this.$(".js-entry-preview-content");

            // cache these elements for use in other methods
            this.set("$previewViewPort", $previewViewPort);
            this.set("$previewContent", this.$(".js-rendered-markdown"));

            $previewViewPort.on("scroll", Ember['default'].run.bind($previewViewPort, setScrollClassName['default'], {
                target: this.$(".js-entry-preview"),
                offset: 10
            }));
        },

        removeScrollHandlers: (function () {
            this.get("$previewViewPort").off("scroll");
        }).on("willDestroyElement"),

        // updated when gh-ed-editor component scrolls
        editorScrollInfo: null,
        // updated when markdown is rendered
        height: null,

        // HTML Preview listens to scrollPosition and updates its scrollTop value
        // This property receives scrollInfo from the textEditor, and height from the preview pane, and will update the
        // scrollPosition value such that when either scrolling or typing-at-the-end of the text editor the preview pane
        // stays in sync
        scrollPosition: Ember['default'].computed("editorScrollInfo", "height", function () {
            if (!this.get("editorScrollInfo")) {
                return 0;
            }

            var scrollInfo = this.get("editorScrollInfo"),
                previewHeight = this.get("$previewContent").height() - this.get("$previewViewPort").height(),
                previewPosition,
                ratio;

            ratio = previewHeight / scrollInfo.diff;
            previewPosition = scrollInfo.top * ratio;

            return previewPosition;
        })
    });

    exports['default'] = EditorViewMixin;

});
define('ghost/mixins/loading-indicator', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var loaderOptions, loadingIndicator;

    loaderOptions = {
        showSpinner: false
    };

    NProgress.configure(loaderOptions);

    loadingIndicator = Ember['default'].Mixin.create({
        actions: {

            loading: function loading() {
                NProgress.start();
                this.router.one("didTransition", function () {
                    NProgress.done();
                });

                return true;
            },

            error: function error() {
                NProgress.done();

                return true;
            }
        }
    });

    exports['default'] = loadingIndicator;

});
define('ghost/mixins/nprogress-save', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var NProgressSaveMixin = Ember['default'].Mixin.create({
        save: function save(options) {
            if (options && options.disableNProgress) {
                return this._super(options);
            }

            NProgress.start();

            return this._super(options).then(function (value) {
                NProgress.done();

                return value;
            })["catch"](function (error) {
                NProgress.done();

                return Ember['default'].RSVP.reject(error);
            });
        }
    });

    exports['default'] = NProgressSaveMixin;

});
define('ghost/mixins/pagination-controller', ['exports', 'ember', 'ghost/utils/ajax'], function (exports, Ember, ajax) {

    'use strict';

    var PaginationControllerMixin = Ember['default'].Mixin.create({
        // set from PaginationRouteMixin
        paginationSettings: null,

        // indicates whether we're currently loading the next page
        isLoading: null,

        /**
         * Takes an ajax response, concatenates any error messages, then generates an error notification.
         * @param {jqXHR} response The jQuery ajax reponse object.
         * @return
         */
        reportLoadError: function reportLoadError(response) {
            var message = "A problem was encountered while loading more records";

            if (response) {
                // Get message from response
                message += ": " + ajax.getRequestErrorMessage(response, true);
            } else {
                message += ".";
            }

            this.notifications.showError(message);
        },

        actions: {
            /**
             * Loads the next paginated page of posts into the ember-data store. Will cause the posts list UI to update.
             * @return
             */
            loadNextPage: function loadNextPage() {
                var self = this,
                    store = this.get("store"),
                    recordType = this.get("model").get("type"),
                    metadata = this.store.metadataFor(recordType),
                    nextPage = metadata.pagination && metadata.pagination.next,
                    paginationSettings = this.get("paginationSettings");

                if (nextPage) {
                    this.set("isLoading", true);
                    this.set("paginationSettings.page", nextPage);

                    store.find(recordType, paginationSettings).then(function () {
                        self.set("isLoading", false);
                    }, function (response) {
                        self.reportLoadError(response);
                    });
                }
            },

            resetPagination: function resetPagination() {
                this.set("paginationSettings.page", 1);
                this.store.setMetadataFor("tag", { pagination: undefined });
            }
        }
    });

    exports['default'] = PaginationControllerMixin;

});
define('ghost/mixins/pagination-route', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var defaultPaginationSettings, PaginationRoute;

    defaultPaginationSettings = {
        page: 1,
        limit: 15
    };

    PaginationRoute = Ember['default'].Mixin.create({
        /**
         * Sets up pagination details
         * @param {object} settings specifies additional pagination details
         */
        setupPagination: function setupPagination(settings) {
            settings = settings || {};
            for (var key in defaultPaginationSettings) {
                if (defaultPaginationSettings.hasOwnProperty(key)) {
                    if (!settings.hasOwnProperty(key)) {
                        settings[key] = defaultPaginationSettings[key];
                    }
                }
            }

            this.set("paginationSettings", settings);
            this.controller.set("paginationSettings", settings);
        }
    });

    exports['default'] = PaginationRoute;

});
define('ghost/mixins/pagination-view-infinite-scroll', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var PaginationViewInfiniteScrollMixin = Ember['default'].Mixin.create({

        /**
         * Determines if we are past a scroll point where we need to fetch the next page
         * @param {object} event The scroll event
         */
        checkScroll: function checkScroll(event) {
            var element = event.target,
                triggerPoint = 100,
                controller = this.get("controller"),
                isLoading = controller.get("isLoading");

            // If we haven't passed our threshold or we are already fetching content, exit
            if (isLoading || element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight) {
                return;
            }

            controller.send("loadNextPage");
        },

        /**
         * Bind to the scroll event once the element is in the DOM
         */
        attachCheckScroll: (function () {
            var el = this.$(),
                controller = this.get("controller");

            el.on("scroll", Ember['default'].run.bind(this, this.checkScroll));

            if (this.element.scrollHeight <= this.element.clientHeight) {
                controller.send("loadNextPage");
            }
        }).on("didInsertElement"),

        /**
         * Unbind from the scroll event when the element is no longer in the DOM
         */
        detachCheckScroll: (function () {
            var el = this.$();
            el.off("scroll");
        }).on("willDestroyElement")
    });

    exports['default'] = PaginationViewInfiniteScrollMixin;

});
define('ghost/mixins/selective-save', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SelectiveSaveMixin = Ember['default'].Mixin.create({
        saveOnly: function saveOnly() {
            if (arguments.length === 0) {
                return Ember['default'].RSVP.resolve();
            }

            if (arguments.length === 1 && Ember['default'].isArray(arguments[0])) {
                return this.saveOnly.apply(this, Array.prototype.slice.call(arguments[0]));
            }

            var propertiesToSave = Array.prototype.slice.call(arguments),
                changed,
                hasMany = {},
                belongsTo = {},
                self = this;

            changed = this.changedAttributes();

            // disable observers so we can make changes to the model but not have
            // them reflected by the UI
            this.beginPropertyChanges();

            // make a copy of any relations the model may have so they can
            // be reapplied later
            this.eachRelationship(function (name, meta) {
                if (meta.kind === "hasMany") {
                    hasMany[name] = self.get(name).slice();
                    return;
                }

                if (meta.kind === "belongsTo") {
                    belongsTo[name] = self.get(name);
                    return;
                }
            });

            try {
                // roll back all changes to the model and then reapply only those that
                // are part of the saveOnly

                self.rollback();

                propertiesToSave.forEach(function (name) {
                    if (hasMany.hasOwnProperty(name)) {
                        self.get(name).clear();

                        hasMany[name].forEach(function (relatedType) {
                            self.get(name).pushObject(relatedType);
                        });

                        return;
                    }

                    if (belongsTo.hasOwnProperty(name)) {
                        return self.updateBelongsTo(name, belongsTo[name]);
                    }

                    if (changed.hasOwnProperty(name)) {
                        return self.set(name, changed[name][1]);
                    }
                });
            } catch (err) {
                // if we were not able to get the model into the correct state
                // put it back the way we found it and return a rejected promise

                Ember['default'].keys(changed).forEach(function (name) {
                    self.set(name, changed[name][1]);
                });

                Ember['default'].keys(hasMany).forEach(function (name) {
                    self.updateHasMany(name, hasMany[name]);
                });

                Ember['default'].keys(belongsTo).forEach(function (name) {
                    self.updateBelongsTo(name, belongsTo[name]);
                });

                self.endPropertyChanges();

                return Ember['default'].RSVP.reject(new Error(err.message || "Error during saveOnly. Changes NOT saved."));
            }

            return this.save()["finally"](function () {
                // reapply any changes that were not part of the save

                Ember['default'].keys(changed).forEach(function (name) {
                    if (propertiesToSave.hasOwnProperty(name)) {
                        return;
                    }

                    self.set(name, changed[name][1]);
                });

                Ember['default'].keys(hasMany).forEach(function (name) {
                    if (propertiesToSave.hasOwnProperty(name)) {
                        return;
                    }

                    self.updateHasMany(name, hasMany[name]);
                });

                Ember['default'].keys(belongsTo).forEach(function (name) {
                    if (propertiesToSave.hasOwnProperty(name)) {
                        return;
                    }

                    self.updateBelongsTo(name, belongsTo[name]);
                });

                // signal that we're finished and normal model observation may continue
                self.endPropertyChanges();
            });
        }
    });

    exports['default'] = SelectiveSaveMixin;

});
define('ghost/mixins/settings-menu-controller', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SettingsMenuControllerMixin = Ember['default'].Mixin.create({
        needs: "application",

        isViewingSubview: Ember['default'].computed("controllers.application.showSettingsMenu", function (key, value) {
            // Not viewing a subview if we can't even see the PSM
            if (!this.get("controllers.application.showSettingsMenu")) {
                return false;
            }
            if (arguments.length > 1) {
                return value;
            }

            return false;
        }),

        actions: {
            showSubview: function showSubview() {
                this.set("isViewingSubview", true);
            },

            closeSubview: function closeSubview() {
                this.set("isViewingSubview", false);
            }
        }
    });

    exports['default'] = SettingsMenuControllerMixin;

});
define('ghost/mixins/shortcuts-route', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    key.filter = function () {
        return true;
    };

    key.setScope("default");
    /**
     * Only routes can implement shortcuts.
     * If you need to trigger actions on the controller,
     * simply call them with `this.get('controller').send('action')`.
     *
     * To implement shortcuts, add this mixin to your `extend()`,
     * and implement a `shortcuts` hash.
     * In this hash, keys are shortcut combinations and values are route action names.
     *  (see [keymaster docs](https://github.com/madrobby/keymaster/blob/master/README.markdown)),
     *
     * ```javascript
     * shortcuts: {
     *     'ctrl+s, command+s': 'save',
     *     'ctrl+alt+z': 'toggleZenMode'
     * }
     * ```
     * For more complex actions, shortcuts can instead have their value
     * be an object like {action, options}
     * ```javascript
     * shortcuts: {
     *      'ctrl+k': {action: 'markdownShortcut', options: 'createLink'}
     * }
     * ```
     * You can set the scope of your shortcut by passing a scope property.
     * ```javascript
     * shortcuts : {
     *   'enter': {action : 'confirmModal', scope: 'modal'}
     * }
     * ```
     * If you don't specify a scope, we use a default scope called "default".
     * To have all your shortcut work in all scopes, give it the scope "all".
     * Find out more at the keymaster docs
     */
    var ShortcutsRoute = Ember['default'].Mixin.create({
        registerShortcuts: function registerShortcuts() {
            var self = this,
                shortcuts = this.get("shortcuts");

            Ember['default'].keys(shortcuts).forEach(function (shortcut) {
                var scope = shortcuts[shortcut].scope || "default",
                    action = shortcuts[shortcut],
                    options;

                if (Ember['default'].typeOf(action) !== "string") {
                    options = action.options;
                    action = action.action;
                }

                key(shortcut, scope, function (event) {
                    // stop things like ctrl+s from actually opening a save dialogue
                    event.preventDefault();
                    self.send(action, options);
                });
            });
        },

        removeShortcuts: function removeShortcuts() {
            var shortcuts = this.get("shortcuts");

            Ember['default'].keys(shortcuts).forEach(function (shortcut) {
                key.unbind(shortcut);
            });
        },

        activate: function activate() {
            this._super();
            this.registerShortcuts();
        },

        deactivate: function deactivate() {
            this._super();
            this.removeShortcuts();
        }
    });

    exports['default'] = ShortcutsRoute;

});
define('ghost/mixins/style-body', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var styleBody = Ember['default'].Mixin.create({
        activate: function activate() {
            this._super();

            var cssClasses = this.get("classNames");

            if (cssClasses) {
                Ember['default'].run.schedule("afterRender", null, function () {
                    cssClasses.forEach(function (curClass) {
                        Ember['default'].$("body").addClass(curClass);
                    });
                });
            }
        },

        deactivate: function deactivate() {
            this._super();

            var cssClasses = this.get("classNames");

            Ember['default'].run.schedule("afterRender", null, function () {
                cssClasses.forEach(function (curClass) {
                    Ember['default'].$("body").removeClass(curClass);
                });
            });
        }
    });

    exports['default'] = styleBody;

});
define('ghost/mixins/text-input', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var BlurField = Ember['default'].Mixin.create({
        selectOnClick: false,
        stopEnterKeyDownPropagation: false,

        click: function click(event) {
            if (this.get("selectOnClick")) {
                event.currentTarget.select();
            }
        },

        keyDown: function keyDown(event) {
            // stop event propagation when pressing "enter"
            // most useful in the case when undesired (global) keyboard shortcuts are getting triggered while interacting
            // with this particular input element.
            if (this.get("stopEnterKeyDownPropagation") && event.keyCode === 13) {
                event.stopPropagation();

                return true;
            }
        }
    });

    exports['default'] = BlurField;

});
define('ghost/mixins/validation-engine', ['exports', 'ember', 'ember-data', 'ghost/utils/ajax', 'ghost/utils/validator-extensions', 'ghost/validators/post', 'ghost/validators/setup', 'ghost/validators/signup', 'ghost/validators/signin', 'ghost/validators/forgotten', 'ghost/validators/setting', 'ghost/validators/reset', 'ghost/validators/user', 'ghost/validators/tag-settings'], function (exports, Ember, DS, ajax, ValidatorExtensions, PostValidator, SetupValidator, SignupValidator, SigninValidator, ForgotValidator, SettingValidator, ResetValidator, UserValidator, TagSettingsValidator) {

    'use strict';

    ValidatorExtensions['default'].init();

    // format errors to be used in `notifications.showErrors`.
    // result is [{message: 'concatenated error messages'}]
    function formatErrors(errors, opts) {
        var message = "There was an error";

        opts = opts || {};

        if (opts.wasSave && opts.validationType) {
            message += " saving this " + opts.validationType;
        }

        if (Ember['default'].isArray(errors)) {
            // get the validator's error messages from the array.
            // normalize array members to map to strings.
            message = errors.map(function (error) {
                var errorMessage;
                if (typeof error === "string") {
                    errorMessage = error;
                } else {
                    errorMessage = error.message;
                }

                return Ember['default'].Handlebars.Utils.escapeExpression(errorMessage);
            }).join("<br />").htmlSafe();
        } else if (errors instanceof Error) {
            message += errors.message || ".";
        } else if (typeof errors === "object") {
            // Get messages from server response
            message += ": " + ajax.getRequestErrorMessage(errors, true);
        } else if (typeof errors === "string") {
            message += ": " + errors;
        } else {
            message += ".";
        }

        // set format for notifications.showErrors
        message = [{ message: message }];

        return message;
    }

    /**
    * The class that gets this mixin will receive these properties and functions.
    * It will be able to validate any properties on itself (or the model it passes to validate())
    * with the use of a declared validator.
    */
    var ValidationEngine = Ember['default'].Mixin.create({
        // these validators can be passed a model to validate when the class that
        // mixes in the ValidationEngine declares a validationType equal to a key on this object.
        // the model is either passed in via `this.validate({ model: object })`
        // or by calling `this.validate()` without the model property.
        // in that case the model will be the class that the ValidationEngine
        // was mixed into, i.e. the controller or Ember Data model.
        validators: {
            post: PostValidator['default'],
            setup: SetupValidator['default'],
            signup: SignupValidator['default'],
            signin: SigninValidator['default'],
            forgotten: ForgotValidator['default'],
            setting: SettingValidator['default'],
            reset: ResetValidator['default'],
            user: UserValidator['default'],
            tag: TagSettingsValidator['default']
        },

        /**
        * Passes the model to the validator specified by validationType.
        * Returns a promise that will resolve if validation succeeds, and reject if not.
        * Some options can be specified:
        *
        * `format: false` - doesn't use formatErrors to concatenate errors for notifications.showErrors.
        *                   will return whatever the specified validator returns.
        *                   since notifications are a common usecase, `format` is true by default.
        *
        * `model: Object` - you can specify the model to be validated, rather than pass the default value of `this`,
        *                   the class that mixes in this mixin.
        */
        validate: function validate(opts) {
            // jscs:disable safeContextKeyword
            opts = opts || {};

            var model = this,
                type,
                validator;

            if (opts.model) {
                model = opts.model;
            } else if (this instanceof DS['default'].Model) {
                model = this;
            } else if (this.get("model")) {
                model = this.get("model");
            }

            type = this.get("validationType") || model.get("validationType");
            validator = this.get("validators." + type) || model.get("validators." + type);

            opts.validationType = type;

            return new Ember['default'].RSVP.Promise(function (resolve, reject) {
                var validationErrors;

                if (!type || !validator) {
                    validationErrors = ["The validator specified, \"" + type + "\", did not exist!"];
                } else {
                    validationErrors = validator.check(model);
                }

                if (Ember['default'].isEmpty(validationErrors)) {
                    return resolve();
                }

                if (opts.format !== false) {
                    validationErrors = formatErrors(validationErrors, opts);
                }

                return reject(validationErrors);
            });
        },

        /**
        * The primary goal of this method is to override the `save` method on Ember Data models.
        * This allows us to run validation before actually trying to save the model to the server.
        * You can supply options to be passed into the `validate` method, since the ED `save` method takes no options.
        */
        save: function save(options) {
            var self = this,

            // this is a hack, but needed for async _super calls.
            // ref: https://github.com/emberjs/ember.js/pull/4301
            _super = this.__nextSuper;

            options = options || {};
            options.wasSave = true;

            // model.destroyRecord() calls model.save() behind the scenes.
            // in that case, we don't need validation checks or error propagation,
            // because the model itself is being destroyed.
            if (this.get("isDeleted")) {
                return this._super();
            }

            // If validation fails, reject with validation errors.
            // If save to the server fails, reject with server response.
            return this.validate(options).then(function () {
                return _super.call(self, options);
            })["catch"](function (result) {
                // server save failed - validate() would have given back an array
                if (!Ember['default'].isArray(result)) {
                    if (options.format !== false) {
                        // concatenate all errors into an array with a single object: [{message: 'concatted message'}]
                        result = formatErrors(result, options);
                    } else {
                        // return the array of errors from the server
                        result = ajax.getRequestErrorMessage(result);
                    }
                }

                return Ember['default'].RSVP.reject(result);
            });
        }
    });

    exports['default'] = ValidationEngine;

});
define('ghost/models/notification', ['exports', 'ember-data'], function (exports, DS) {

    'use strict';

    var Notification = DS['default'].Model.extend({
        dismissible: DS['default'].attr("boolean"),
        location: DS['default'].attr("string"),
        status: DS['default'].attr("string"),
        type: DS['default'].attr("string"),
        message: DS['default'].attr("string")
    });

    exports['default'] = Notification;

});
define('ghost/models/post', ['exports', 'ember', 'ember-data', 'ghost/mixins/validation-engine', 'ghost/mixins/nprogress-save'], function (exports, Ember, DS, ValidationEngine, NProgressSaveMixin) {

    'use strict';

    var Post = DS['default'].Model.extend(NProgressSaveMixin['default'], ValidationEngine['default'], {
        validationType: "post",

        uuid: DS['default'].attr("string"),
        title: DS['default'].attr("string", { defaultValue: "" }),
        slug: DS['default'].attr("string"),
        markdown: DS['default'].attr("string", { defaultValue: "" }),
        html: DS['default'].attr("string"),
        image: DS['default'].attr("string"),
        featured: DS['default'].attr("boolean", { defaultValue: false }),
        page: DS['default'].attr("boolean", { defaultValue: false }),
        status: DS['default'].attr("string", { defaultValue: "draft" }),
        language: DS['default'].attr("string", { defaultValue: "en_US" }),
        meta_title: DS['default'].attr("string"),
        meta_description: DS['default'].attr("string"),
        author: DS['default'].belongsTo("user", { async: true }),
        author_id: DS['default'].attr("number"),
        updated_at: DS['default'].attr("moment-date"),
        updated_by: DS['default'].attr(),
        published_at: DS['default'].attr("moment-date"),
        published_by: DS['default'].belongsTo("user", { async: true }),
        created_at: DS['default'].attr("moment-date"),
        created_by: DS['default'].attr(),
        tags: DS['default'].hasMany("tag", { embedded: "always" }),
        url: DS['default'].attr("string"),

        absoluteUrl: Ember['default'].computed("url", "ghostPaths.url", "config.blogUrl", function () {
            var blogUrl = this.get("config.blogUrl"),
                postUrl = this.get("url");
            return this.get("ghostPaths.url").join(blogUrl, postUrl);
        }),

        previewUrl: Ember['default'].computed("uuid", "ghostPaths.url", "config.blogUrl", "config.routeKeywords.preview", function () {
            var blogUrl = this.get("config.blogUrl"),
                uuid = this.get("uuid"),
                previewKeyword = this.get("config.routeKeywords.preview");
            // New posts don't have a preview
            if (!uuid) {
                return "";
            }
            return this.get("ghostPaths.url").join(blogUrl, previewKeyword, uuid);
        }),

        scratch: null,
        titleScratch: null,

        // Computed post properties

        isPublished: Ember['default'].computed.equal("status", "published"),
        isDraft: Ember['default'].computed.equal("status", "draft"),

        // remove client-generated tags, which have `id: null`.
        // Ember Data won't recognize/update them automatically
        // when returned from the server with ids.
        updateTags: function updateTags() {
            var tags = this.get("tags"),
                oldTags = tags.filterBy("id", null);

            tags.removeObjects(oldTags);
            oldTags.invoke("deleteRecord");
        },

        isAuthoredByUser: function isAuthoredByUser(user) {
            return parseInt(user.get("id"), 10) === parseInt(this.get("author_id"), 10);
        }

    });

    exports['default'] = Post;

});
define('ghost/models/role', ['exports', 'ember', 'ember-data'], function (exports, Ember, DS) {

    'use strict';

    var Role = DS['default'].Model.extend({
        uuid: DS['default'].attr("string"),
        name: DS['default'].attr("string"),
        description: DS['default'].attr("string"),
        created_at: DS['default'].attr("moment-date"),
        updated_at: DS['default'].attr("moment-date"),
        created_by: DS['default'].attr(),
        updated_by: DS['default'].attr(),

        lowerCaseName: Ember['default'].computed("name", function () {
            return this.get("name").toLocaleLowerCase();
        })
    });

    exports['default'] = Role;

});
define('ghost/models/setting', ['exports', 'ember-data', 'ghost/mixins/validation-engine', 'ghost/mixins/nprogress-save'], function (exports, DS, ValidationEngine, NProgressSaveMixin) {

    'use strict';

    var Setting = DS['default'].Model.extend(NProgressSaveMixin['default'], ValidationEngine['default'], {
        validationType: "setting",

        title: DS['default'].attr("string"),
        description: DS['default'].attr("string"),
        email: DS['default'].attr("string"),
        logo: DS['default'].attr("string"),
        cover: DS['default'].attr("string"),
        defaultLang: DS['default'].attr("string"),
        postsPerPage: DS['default'].attr("number"),
        forceI18n: DS['default'].attr("boolean"),
        permalinks: DS['default'].attr("string"),
        activeTheme: DS['default'].attr("string"),
        availableThemes: DS['default'].attr(),
        ghost_head: DS['default'].attr("string"),
        ghost_foot: DS['default'].attr("string"),
        labs: DS['default'].attr("string"),
        navigation: DS['default'].attr("string"),
        isPrivate: DS['default'].attr("boolean"),
        password: DS['default'].attr("string")
    });

    exports['default'] = Setting;

});
define('ghost/models/slug-generator', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SlugGenerator = Ember['default'].Object.extend({
        ghostPaths: null,
        slugType: null,
        value: null,
        toString: function toString() {
            return this.get("value");
        },
        generateSlug: function generateSlug(textToSlugify) {
            var self = this,
                url;

            if (!textToSlugify) {
                return Ember['default'].RSVP.resolve("");
            }

            url = this.get("ghostPaths.url").api("slugs", this.get("slugType"), encodeURIComponent(textToSlugify));

            return ic.ajax.request(url, {
                type: "GET"
            }).then(function (response) {
                var slug = response.slugs[0].slug;
                self.set("value", slug);
                return slug;
            });
        }
    });

    exports['default'] = SlugGenerator;

});
define('ghost/models/tag', ['exports', 'ember-data', 'ghost/mixins/validation-engine', 'ghost/mixins/nprogress-save'], function (exports, DS, ValidationEngine, NProgressSaveMixin) {

    'use strict';

    var Tag = DS['default'].Model.extend(NProgressSaveMixin['default'], ValidationEngine['default'], {
        validationType: "tag",

        uuid: DS['default'].attr("string"),
        name: DS['default'].attr("string"),
        slug: DS['default'].attr("string"),
        description: DS['default'].attr("string"),
        parent: DS['default'].attr(),
        meta_title: DS['default'].attr("string"),
        meta_description: DS['default'].attr("string"),
        image: DS['default'].attr("string"),
        hidden: DS['default'].attr("boolean"),
        created_at: DS['default'].attr("moment-date"),
        updated_at: DS['default'].attr("moment-date"),
        created_by: DS['default'].attr(),
        updated_by: DS['default'].attr(),
        post_count: DS['default'].attr("number")
    });

    exports['default'] = Tag;

});
define('ghost/models/user', ['exports', 'ember', 'ember-data', 'ghost/mixins/validation-engine', 'ghost/mixins/nprogress-save', 'ghost/mixins/selective-save'], function (exports, Ember, DS, ValidationEngine, NProgressSaveMixin, SelectiveSaveMixin) {

    'use strict';

    var User = DS['default'].Model.extend(NProgressSaveMixin['default'], SelectiveSaveMixin['default'], ValidationEngine['default'], {
        validationType: "user",

        uuid: DS['default'].attr("string"),
        name: DS['default'].attr("string"),
        slug: DS['default'].attr("string"),
        email: DS['default'].attr("string"),
        image: DS['default'].attr("string"),
        cover: DS['default'].attr("string"),
        bio: DS['default'].attr("string"),
        website: DS['default'].attr("string"),
        location: DS['default'].attr("string"),
        accessibility: DS['default'].attr("string"),
        status: DS['default'].attr("string"),
        language: DS['default'].attr("string", { defaultValue: "en_US" }),
        meta_title: DS['default'].attr("string"),
        meta_description: DS['default'].attr("string"),
        last_login: DS['default'].attr("moment-date"),
        created_at: DS['default'].attr("moment-date"),
        created_by: DS['default'].attr("number"),
        updated_at: DS['default'].attr("moment-date"),
        updated_by: DS['default'].attr("number"),
        roles: DS['default'].hasMany("role", { embedded: "always" }),

        role: Ember['default'].computed("roles", function (name, value) {
            if (arguments.length > 1) {
                // Only one role per user, so remove any old data.
                this.get("roles").clear();
                this.get("roles").pushObject(value);

                return value;
            }

            return this.get("roles.firstObject");
        }),

        // TODO: Once client-side permissions are in place,
        // remove the hard role check.
        isAuthor: Ember['default'].computed.equal("role.name", "Author"),
        isEditor: Ember['default'].computed.equal("role.name", "Editor"),
        isAdmin: Ember['default'].computed.equal("role.name", "Administrator"),
        isOwner: Ember['default'].computed.equal("role.name", "Owner"),

        saveNewPassword: function saveNewPassword() {
            var url = this.get("ghostPaths.url").api("users", "password");

            return ic.ajax.request(url, {
                type: "PUT",
                data: {
                    password: [{
                        user_id: this.get("id"),
                        oldPassword: this.get("password"),
                        newPassword: this.get("newPassword"),
                        ne2Password: this.get("ne2Password")
                    }]
                }
            });
        },

        resendInvite: function resendInvite() {
            var fullUserData = this.toJSON(),
                userData = {
                email: fullUserData.email,
                roles: fullUserData.roles
            };

            return ic.ajax.request(this.get("ghostPaths.url").api("users"), {
                type: "POST",
                data: JSON.stringify({ users: [userData] }),
                contentType: "application/json"
            });
        },

        passwordValidationErrors: Ember['default'].computed("password", "newPassword", "ne2Password", function () {
            var validationErrors = [];

            if (!validator.equals(this.get("newPassword"), this.get("ne2Password"))) {
                validationErrors.push({ message: "Your new passwords do not match" });
            }

            if (!validator.isLength(this.get("newPassword"), 8)) {
                validationErrors.push({ message: "Your password is not long enough. It must be at least 8 characters long." });
            }

            return validationErrors;
        }),

        isPasswordValid: Ember['default'].computed.empty("passwordValidationErrors.[]"),

        active: (function () {
            return ["active", "warn-1", "warn-2", "warn-3", "warn-4", "locked"].indexOf(this.get("status")) > -1;
        }).property("status"),

        invited: (function () {
            return ["invited", "invited-pending"].indexOf(this.get("status")) > -1;
        }).property("status"),

        pending: Ember['default'].computed.equal("status", "invited-pending").property("status")
    });

    exports['default'] = User;

});
define('ghost/router', ['exports', 'ember', 'ghost/utils/ghost-paths', 'ghost/utils/document-title'], function (exports, Ember, ghostPaths, documentTitle) {

    'use strict';

    var Router = Ember['default'].Router.extend({
        location: "trailing-history", // use HTML5 History API instead of hash-tag based URLs
        rootURL: ghostPaths['default']().adminRoot, // admin interface lives under sub-directory /ghost

        clearNotifications: Ember['default'].on("didTransition", function () {
            this.notifications.closePassive();
            this.notifications.displayDelayed();
        })
    });

    documentTitle['default']();

    Router.map(function () {
        this.route("setup");
        this.route("signin");
        this.route("signout");
        this.route("signup", { path: "/signup/:token" });
        this.route("forgotten");
        this.route("reset", { path: "/reset/:token" });

        this.resource("posts", { path: "/" }, function () {
            this.route("post", { path: ":post_id" });
        });

        this.resource("editor", function () {
            this.route("new", { path: "" });
            this.route("edit", { path: ":post_id" });
        });

        this.resource("settings", function () {
            this.route("general");

            this.resource("settings.users", { path: "/users" }, function () {
                this.route("user", { path: "/:slug" });
            });

            this.route("about");
            this.route("tags");
            this.route("labs");
            this.route("code-injection");
            this.route("navigation");
        });

        // Redirect debug to settings labs
        this.route("debug");

        // Redirect legacy content to posts
        this.route("content");

        this.route("error404", { path: "/*path" });
    });

    exports['default'] = Router;

});
define('ghost/routes/application', ['exports', 'ember', 'ghost/mixins/shortcuts-route', 'ghost/utils/ctrl-or-cmd'], function (exports, Ember, ShortcutsRoute, ctrlOrCmd) {

    'use strict';

    var ApplicationRoute,
        shortcuts = {};

    shortcuts.esc = { action: "closePopups", scope: "all" };
    shortcuts.enter = { action: "confirmModal", scope: "modal" };
    shortcuts[ctrlOrCmd['default'] + "+s"] = { action: "save", scope: "all" };

    ApplicationRoute = Ember['default'].Route.extend(SimpleAuth.ApplicationRouteMixin, ShortcutsRoute['default'], {
        shortcuts: shortcuts,

        afterModel: function afterModel(model, transition) {
            if (this.get("session").isAuthenticated) {
                transition.send("loadServerNotifications");
            }
        },

        title: function title(tokens) {
            return tokens.join(" - ") + " - " + this.get("config.blogTitle");
        },

        actions: {
            toggleGlobalMobileNav: function toggleGlobalMobileNav() {
                this.toggleProperty("controller.showGlobalMobileNav");
            },

            openSettingsMenu: function openSettingsMenu() {
                this.set("controller.showSettingsMenu", true);
            },

            closeSettingsMenu: function closeSettingsMenu() {
                this.set("controller.showSettingsMenu", false);
            },

            toggleSettingsMenu: function toggleSettingsMenu() {
                this.toggleProperty("controller.showSettingsMenu");
            },

            closePopups: function closePopups() {
                this.get("dropdown").closeDropdowns();
                this.get("notifications").closeAll();

                // Close right outlet if open
                this.send("closeSettingsMenu");

                this.send("closeModal");
            },

            signedIn: function signedIn() {
                this.send("loadServerNotifications", true);
            },

            sessionAuthenticationFailed: function sessionAuthenticationFailed(error) {
                if (error.errors) {
                    // These are server side errors, which can be marked as htmlSafe
                    error.errors.forEach(function (err) {
                        err.message = err.message.htmlSafe();
                    });

                    this.notifications.showErrors(error.errors);
                } else {
                    // connection errors don't return proper status message, only req.body
                    this.notifications.showError("There was a problem on the server.");
                }
            },

            sessionAuthenticationSucceeded: function sessionAuthenticationSucceeded() {
                var appController = this.controllerFor("application"),
                    self = this;

                if (appController && appController.get("skipAuthSuccessHandler")) {
                    return;
                }

                this.get("session.user").then(function (user) {
                    self.send("signedIn", user);
                    var attemptedTransition = self.get("session").get("attemptedTransition");
                    if (attemptedTransition) {
                        attemptedTransition.retry();
                        self.get("session").set("attemptedTransition", null);
                    } else {
                        self.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
                    }
                });
            },

            sessionInvalidationFailed: function sessionInvalidationFailed(error) {
                this.notifications.showError(error.message);
            },

            openModal: function openModal(modalName, model, type) {
                this.get("dropdown").closeDropdowns();
                key.setScope("modal");
                modalName = "modals/" + modalName;
                this.set("modalName", modalName);

                // We don't always require a modal to have a controller
                // so we're skipping asserting if one exists
                if (this.controllerFor(modalName, true)) {
                    this.controllerFor(modalName).set("model", model);

                    if (type) {
                        this.controllerFor(modalName).set("imageType", type);
                        this.controllerFor(modalName).set("src", model.get(type));
                    }
                }

                return this.render(modalName, {
                    into: "application",
                    outlet: "modal"
                });
            },

            confirmModal: function confirmModal() {
                var modalName = this.get("modalName");

                this.send("closeModal");

                if (this.controllerFor(modalName, true)) {
                    this.controllerFor(modalName).send("confirmAccept");
                }
            },

            closeModal: function closeModal() {
                this.disconnectOutlet({
                    outlet: "modal",
                    parentView: "application"
                });

                key.setScope("default");
            },

            loadServerNotifications: function loadServerNotifications(isDelayed) {
                var self = this;

                if (this.session.isAuthenticated) {
                    this.get("session.user").then(function (user) {
                        if (!user.get("isAuthor") && !user.get("isEditor")) {
                            self.store.findAll("notification").then(function (serverNotifications) {
                                serverNotifications.forEach(function (notification) {
                                    self.notifications.handleNotification(notification, isDelayed);
                                });
                            });
                        }
                    });
                }
            },

            handleErrors: function handleErrors(errors) {
                var self = this;

                this.notifications.clear();
                errors.forEach(function (errorObj) {
                    self.notifications.showError(errorObj.message || errorObj);

                    if (errorObj.hasOwnProperty("el")) {
                        errorObj.el.addClass("input-error");
                    }
                });
            },

            // noop default for unhandled save (used from shortcuts)
            save: Ember['default'].K
        }
    });

    exports['default'] = ApplicationRoute;

});
define('ghost/routes/authenticated', ['exports', 'ember'], function (exports, Ember) {

	'use strict';

	var AuthenticatedRoute = Ember['default'].Route.extend(SimpleAuth.AuthenticatedRouteMixin);

	exports['default'] = AuthenticatedRoute;

});
define('ghost/routes/content', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var ContentRoute = Ember['default'].Route.extend({
        beforeModel: function beforeModel() {
            this.transitionTo("posts");
        }
    });

    exports['default'] = ContentRoute;

});
define('ghost/routes/debug', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var DebugRoute = Ember['default'].Route.extend({
        beforeModel: function beforeModel() {
            this.transitionTo("settings.labs");
        }
    });

    exports['default'] = DebugRoute;

});
define('ghost/routes/editor/edit', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/editor-base-route', 'ghost/utils/isNumber', 'ghost/utils/isFinite'], function (exports, AuthenticatedRoute, base, isNumber, isFinite) {

    'use strict';

    var EditorEditRoute = AuthenticatedRoute['default'].extend(base['default'], {
        titleToken: "Editor",

        model: function model(params) {
            var self = this,
                post,
                postId,
                query;

            postId = Number(params.post_id);

            if (!isNumber['default'](postId) || !isFinite['default'](postId) || postId % 1 !== 0 || postId <= 0) {
                return this.transitionTo("error404", "editor/" + params.post_id);
            }

            post = this.store.getById("post", postId);
            if (post) {
                return post;
            }

            query = {
                id: postId,
                status: "all",
                staticPages: "all"
            };

            return self.store.find("post", query).then(function (records) {
                var post = records.get("firstObject");

                if (post) {
                    return post;
                }

                return self.replaceWith("posts.index");
            });
        },

        afterModel: function afterModel(post) {
            var self = this;

            return self.get("session.user").then(function (user) {
                if (user.get("isAuthor") && !post.isAuthoredByUser(user)) {
                    return self.replaceWith("posts.index");
                }
            });
        },

        actions: {
            authorizationFailed: function authorizationFailed() {
                this.send("openModal", "signin");
            }
        }
    });

    exports['default'] = EditorEditRoute;

});
define('ghost/routes/editor/index', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var EditorRoute = Ember['default'].Route.extend({
        beforeModel: function beforeModel() {
            this.transitionTo("editor.new");
        }
    });

    exports['default'] = EditorRoute;

});
define('ghost/routes/editor/new', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/editor-base-route'], function (exports, AuthenticatedRoute, base) {

    'use strict';

    var EditorNewRoute = AuthenticatedRoute['default'].extend(base['default'], {
        titleToken: "Editor",

        model: function model() {
            var self = this;
            return this.get("session.user").then(function (user) {
                return self.store.createRecord("post", {
                    author: user
                });
            });
        },

        setupController: function setupController(controller, model) {
            var psm = this.controllerFor("post-settings-menu");

            // make sure there are no titleObserver functions hanging around
            // from previous posts
            psm.removeObserver("titleScratch", psm, "titleObserver");

            // Ensure that the PSM Image Uploader and Publish Date selector resets
            psm.send("resetUploader");
            psm.send("resetPubDate");

            this._super(controller, model);
        }
    });

    exports['default'] = EditorNewRoute;

});
define('ghost/routes/error404', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var Error404Route = Ember['default'].Route.extend({
        controllerName: "error",
        templateName: "error",
        titleToken: "Error",

        model: function model() {
            return {
                status: 404
            };
        }
    });

    exports['default'] = Error404Route;

});
define('ghost/routes/forgotten', ['exports', 'ember', 'ghost/mixins/style-body', 'ghost/mixins/loading-indicator'], function (exports, Ember, styleBody, loadingIndicator) {

    'use strict';

    var ForgottenRoute = Ember['default'].Route.extend(styleBody['default'], loadingIndicator['default'], {
        titleToken: "Forgotten Password",

        classNames: ["ghost-forgotten"]
    });

    exports['default'] = ForgottenRoute;

});
define('ghost/routes/mobile-index-route', ['exports', 'ember', 'ghost/utils/mobile'], function (exports, Ember, mobileQuery) {

    'use strict';

    var MobileIndexRoute = Ember['default'].Route.extend({
        desktopTransition: Ember['default'].K,

        activate: function attachDesktopTransition() {
            this._super();
            mobileQuery['default'].addListener(this.desktopTransitionMQ);
        },

        deactivate: function removeDesktopTransition() {
            this._super();
            mobileQuery['default'].removeListener(this.desktopTransitionMQ);
        },

        setDesktopTransitionMQ: (function () {
            var self = this;
            this.set("desktopTransitionMQ", function desktopTransitionMQ() {
                if (!mobileQuery['default'].matches) {
                    self.desktopTransition();
                }
            });
        }).on("init")
    });

    exports['default'] = MobileIndexRoute;

});
define('ghost/routes/posts', ['exports', 'ember', 'ghost/routes/authenticated', 'ghost/mixins/style-body', 'ghost/mixins/shortcuts-route', 'ghost/mixins/loading-indicator', 'ghost/mixins/pagination-route'], function (exports, Ember, AuthenticatedRoute, styleBody, ShortcutsRoute, loadingIndicator, PaginationRouteMixin) {

    'use strict';

    var paginationSettings, PostsRoute;

    paginationSettings = {
        status: "all",
        staticPages: "all",
        page: 1
    };

    PostsRoute = AuthenticatedRoute['default'].extend(ShortcutsRoute['default'], styleBody['default'], loadingIndicator['default'], PaginationRouteMixin['default'], {
        titleToken: "Content",

        classNames: ["manage"],

        model: function model() {
            var self = this;

            return this.get("session.user").then(function (user) {
                if (user.get("isAuthor")) {
                    paginationSettings.author = user.get("slug");
                }

                // using `.filter` allows the template to auto-update when new models are pulled in from the server.
                // we just need to 'return true' to allow all models by default.
                return self.store.filter("post", paginationSettings, function (post) {
                    if (user.get("isAuthor")) {
                        return post.isAuthoredByUser(user);
                    }

                    return true;
                });
            });
        },

        setupController: function setupController(controller, model) {
            this._super(controller, model);
            this.setupPagination(paginationSettings);
        },

        stepThroughPosts: function stepThroughPosts(step) {
            var currentPost = this.get("controller.currentPost"),
                posts = this.get("controller.arrangedContent"),
                length = posts.get("length"),
                newPosition;

            newPosition = posts.indexOf(currentPost) + step;

            // if we are on the first or last item
            // just do nothing (desired behavior is to not
            // loop around)
            if (newPosition >= length) {
                return;
            } else if (newPosition < 0) {
                return;
            }

            this.transitionTo("posts.post", posts.objectAt(newPosition));
        },

        scrollContent: function scrollContent(amount) {
            var content = Ember['default'].$(".js-content-preview"),
                scrolled = content.scrollTop();

            content.scrollTop(scrolled + 50 * amount);
        },

        shortcuts: {
            "up, k": "moveUp",
            "down, j": "moveDown",
            left: "focusList",
            right: "focusContent",
            c: "newPost"
        },

        actions: {
            focusList: function focusList() {
                this.controller.set("keyboardFocus", "postList");
            },
            focusContent: function focusContent() {
                this.controller.set("keyboardFocus", "postContent");
            },
            newPost: function newPost() {
                this.transitionTo("editor.new");
            },

            moveUp: function moveUp() {
                if (this.controller.get("postContentFocused")) {
                    this.scrollContent(-1);
                } else {
                    this.stepThroughPosts(-1);
                }
            },

            moveDown: function moveDown() {
                if (this.controller.get("postContentFocused")) {
                    this.scrollContent(1);
                } else {
                    this.stepThroughPosts(1);
                }
            }
        }
    });

    exports['default'] = PostsRoute;

});
define('ghost/routes/posts/index', ['exports', 'ghost/routes/mobile-index-route', 'ghost/mixins/loading-indicator', 'ghost/utils/mobile'], function (exports, MobileIndexRoute, loadingIndicator, mobileQuery) {

    'use strict';

    var PostsIndexRoute = MobileIndexRoute['default'].extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator['default'], {
        noPosts: false,

        // Transition to a specific post if we're not on mobile
        beforeModel: function beforeModel() {
            if (!mobileQuery['default'].matches) {
                return this.goToPost();
            }
        },

        setupController: function setupController(controller, model) {
            /*jshint unused:false*/
            controller.set("noPosts", this.get("noPosts"));
        },

        goToPost: function goToPost() {
            var self = this,

            // the store has been populated by PostsRoute
            posts = this.store.all("post"),
                post;

            return this.get("session.user").then(function (user) {
                post = posts.find(function (post) {
                    // Authors can only see posts they've written
                    if (user.get("isAuthor")) {
                        return post.isAuthoredByUser(user);
                    }

                    return true;
                });

                if (post) {
                    return self.transitionTo("posts.post", post);
                }

                self.set("noPosts", true);
            });
        },

        // Mobile posts route callback
        desktopTransition: function desktopTransition() {
            this.goToPost();
        }
    });

    exports['default'] = PostsIndexRoute;

});
define('ghost/routes/posts/post', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/loading-indicator', 'ghost/mixins/shortcuts-route', 'ghost/utils/isNumber', 'ghost/utils/isFinite'], function (exports, AuthenticatedRoute, loadingIndicator, ShortcutsRoute, isNumber, isFinite) {

    'use strict';

    var PostsPostRoute = AuthenticatedRoute['default'].extend(loadingIndicator['default'], ShortcutsRoute['default'], {
        model: function model(params) {
            var self = this,
                post,
                postId,
                query;

            postId = Number(params.post_id);

            if (!isNumber['default'](postId) || !isFinite['default'](postId) || postId % 1 !== 0 || postId <= 0) {
                return this.transitionTo("error404", params.post_id);
            }

            post = this.store.getById("post", postId);
            if (post) {
                return post;
            }

            query = {
                id: postId,
                status: "all",
                staticPages: "all"
            };

            return self.store.find("post", query).then(function (records) {
                var post = records.get("firstObject");

                if (post) {
                    return post;
                }

                return self.replaceWith("posts.index");
            });
        },

        afterModel: function afterModel(post) {
            var self = this;

            return self.get("session.user").then(function (user) {
                if (user.get("isAuthor") && !post.isAuthoredByUser(user)) {
                    return self.replaceWith("posts.index");
                }
            });
        },

        setupController: function setupController(controller, model) {
            this._super(controller, model);

            this.controllerFor("posts").set("currentPost", model);
        },

        shortcuts: {
            "enter, o": "openEditor",
            "command+backspace, ctrl+backspace": "deletePost"
        },

        actions: {
            openEditor: function openEditor() {
                this.transitionTo("editor.edit", this.get("controller.model"));
            },

            deletePost: function deletePost() {
                this.send("openModal", "delete-post", this.get("controller.model"));
            }
        }
    });

    exports['default'] = PostsPostRoute;

});
define('ghost/routes/reset', ['exports', 'ember', 'ghost/mixins/style-body', 'ghost/mixins/loading-indicator'], function (exports, Ember, styleBody, loadingIndicator) {

    'use strict';

    var ResetRoute = Ember['default'].Route.extend(styleBody['default'], loadingIndicator['default'], {
        classNames: ["ghost-reset"],

        beforeModel: function beforeModel() {
            if (this.get("session").isAuthenticated) {
                this.notifications.showWarn("You can't reset your password while you're signed in.", { delayed: true });
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        setupController: function setupController(controller, params) {
            controller.token = params.token;
        },

        // Clear out any sensitive information
        deactivate: function deactivate() {
            this._super();
            this.controller.clearData();
        }
    });

    exports['default'] = ResetRoute;

});
define('ghost/routes/settings', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/style-body', 'ghost/mixins/loading-indicator'], function (exports, AuthenticatedRoute, styleBody, loadingIndicator) {

    'use strict';

    var SettingsRoute = AuthenticatedRoute['default'].extend(styleBody['default'], loadingIndicator['default'], {
        titleToken: "Settings",

        classNames: ["settings"]
    });

    exports['default'] = SettingsRoute;

});
define('ghost/routes/settings/about', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/loading-indicator', 'ghost/mixins/style-body'], function (exports, AuthenticatedRoute, loadingIndicator, styleBody) {

    'use strict';

    var SettingsAboutRoute = AuthenticatedRoute['default'].extend(styleBody['default'], loadingIndicator['default'], {
        titleToken: "About",

        classNames: ["settings-view-about"],

        cachedConfig: false,
        model: function model() {
            var cachedConfig = this.get("cachedConfig"),
                self = this;
            if (cachedConfig) {
                return cachedConfig;
            }

            return ic.ajax.request(this.get("ghostPaths.url").api("configuration")).then(function (configurationResponse) {
                var configKeyValues = configurationResponse.configuration;
                cachedConfig = {};
                configKeyValues.forEach(function (configKeyValue) {
                    cachedConfig[configKeyValue.key] = configKeyValue.value;
                });
                self.set("cachedConfig", cachedConfig);
                return cachedConfig;
            });
        }
    });

    exports['default'] = SettingsAboutRoute;

});
define('ghost/routes/settings/apps', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/current-user-settings', 'ghost/mixins/style-body'], function (exports, AuthenticatedRoute, CurrentUserSettings, styleBody) {

    'use strict';

    var AppsRoute = AuthenticatedRoute['default'].extend(styleBody['default'], CurrentUserSettings['default'], {
        titleToken: "Apps",

        classNames: ["settings-view-apps"],

        beforeModel: function beforeModel() {
            if (!this.get("config.apps")) {
                return this.transitionTo("settings.general");
            }

            return this.get("session.user").then(this.transitionAuthor()).then(this.transitionEditor());
        },

        model: function model() {
            return this.store.find("app");
        }
    });

    exports['default'] = AppsRoute;

});
define('ghost/routes/settings/code-injection', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/loading-indicator', 'ghost/mixins/current-user-settings', 'ghost/mixins/style-body'], function (exports, AuthenticatedRoute, loadingIndicator, CurrentUserSettings, styleBody) {

    'use strict';

    var SettingsCodeInjectionRoute = AuthenticatedRoute['default'].extend(styleBody['default'], loadingIndicator['default'], CurrentUserSettings['default'], {
        classNames: ["settings-view-code"],

        beforeModel: function beforeModel() {
            return this.get("session.user").then(this.transitionAuthor()).then(this.transitionEditor());
        },

        model: function model() {
            return this.store.find("setting", { type: "blog,theme" }).then(function (records) {
                return records.get("firstObject");
            });
        },

        actions: {
            save: function save() {
                this.get("controller").send("save");
            }
        }
    });

    exports['default'] = SettingsCodeInjectionRoute;

});
define('ghost/routes/settings/general', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/loading-indicator', 'ghost/mixins/current-user-settings', 'ghost/mixins/style-body'], function (exports, AuthenticatedRoute, loadingIndicator, CurrentUserSettings, styleBody) {

    'use strict';

    var SettingsGeneralRoute = AuthenticatedRoute['default'].extend(styleBody['default'], loadingIndicator['default'], CurrentUserSettings['default'], {
        titleToken: "General",

        classNames: ["settings-view-general"],

        beforeModel: function beforeModel() {
            return this.get("session.user").then(this.transitionAuthor()).then(this.transitionEditor());
        },

        model: function model() {
            return this.store.find("setting", { type: "blog,theme" }).then(function (records) {
                return records.get("firstObject");
            });
        },

        actions: {
            save: function save() {
                this.get("controller").send("save");
            }
        }
    });

    exports['default'] = SettingsGeneralRoute;

});
define('ghost/routes/settings/index', ['exports', 'ghost/routes/mobile-index-route', 'ghost/mixins/current-user-settings', 'ghost/utils/mobile'], function (exports, MobileIndexRoute, CurrentUserSettings, mobileQuery) {

    'use strict';

    var SettingsIndexRoute = MobileIndexRoute['default'].extend(SimpleAuth.AuthenticatedRouteMixin, CurrentUserSettings['default'], {
        titleToken: "Settings",

        // Redirect users without permission to view settings,
        // and show the settings.general route unless the user
        // is mobile
        beforeModel: function beforeModel() {
            var self = this;
            return this.get("session.user").then(this.transitionAuthor()).then(this.transitionEditor()).then(function () {
                if (!mobileQuery['default'].matches) {
                    self.transitionTo("settings.general");
                }
            });
        },

        desktopTransition: function desktopTransition() {
            this.transitionTo("settings.general");
        }
    });

    exports['default'] = SettingsIndexRoute;

});
define('ghost/routes/settings/labs', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/style-body', 'ghost/mixins/current-user-settings', 'ghost/mixins/loading-indicator'], function (exports, AuthenticatedRoute, styleBody, CurrentUserSettings, loadingIndicator) {

    'use strict';

    var LabsRoute = AuthenticatedRoute['default'].extend(styleBody['default'], loadingIndicator['default'], CurrentUserSettings['default'], {
        titleToken: "Labs",

        classNames: ["settings"],
        beforeModel: function beforeModel() {
            return this.get("session.user").then(this.transitionAuthor()).then(this.transitionEditor());
        },

        model: function model() {
            return this.store.find("setting", { type: "blog,theme" }).then(function (records) {
                return records.get("firstObject");
            });
        }
    });

    exports['default'] = LabsRoute;

});
define('ghost/routes/settings/navigation', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/current-user-settings', 'ghost/mixins/style-body'], function (exports, AuthenticatedRoute, CurrentUserSettings, styleBody) {

    'use strict';

    var NavigationRoute = AuthenticatedRoute['default'].extend(styleBody['default'], CurrentUserSettings['default'], {

        titleToken: "Navigation",

        classNames: ["settings-view-navigation"],

        beforeModel: function beforeModel() {
            return this.get("session.user").then(this.transitionAuthor());
        },

        model: function model() {
            return this.store.find("setting", { type: "blog,theme" }).then(function (records) {
                return records.get("firstObject");
            });
        },

        actions: {
            save: function save() {
                // since shortcuts are run on the route, we have to signal to the components
                // on the page that we're about to save.
                $(".page-actions .btn-blue").focus();

                this.get("controller").send("save");
            }
        }
    });

    exports['default'] = NavigationRoute;

});
define('ghost/routes/settings/tags', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/current-user-settings', 'ghost/mixins/pagination-route'], function (exports, AuthenticatedRoute, CurrentUserSettings, PaginationRouteMixin) {

    'use strict';

    var TagsRoute, paginationSettings;

    paginationSettings = {
        page: 1,
        include: "post_count",
        limit: 15
    };

    TagsRoute = AuthenticatedRoute['default'].extend(CurrentUserSettings['default'], PaginationRouteMixin['default'], {
        actions: {
            willTransition: function willTransition() {
                this.send("closeSettingsMenu");
            }
        },

        titleToken: "Tags",

        beforeModel: function beforeModel() {
            return this.get("session.user").then(this.transitionAuthor());
        },

        model: function model() {
            this.store.unloadAll("tag");

            return this.store.filter("tag", paginationSettings, function (tag) {
                return !tag.get("isNew");
            });
        },

        setupController: function setupController(controller, model) {
            this._super(controller, model);
            this.setupPagination(paginationSettings);
        },

        renderTemplate: function renderTemplate(controller, model) {
            this._super(controller, model);
            this.render("settings/tags/settings-menu", {
                into: "application",
                outlet: "settings-menu",
                view: "settings/tags/settings-menu"
            });
        },

        deactivate: function deactivate() {
            this.controller.send("resetPagination");
        }
    });

    exports['default'] = TagsRoute;

});
define('ghost/routes/settings/users', ['exports', 'ghost/routes/authenticated'], function (exports, AuthenticatedRoute) {

	'use strict';

	var UsersRoute = AuthenticatedRoute['default'].extend();

	exports['default'] = UsersRoute;

});
define('ghost/routes/settings/users/index', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/current-user-settings', 'ghost/mixins/pagination-route', 'ghost/mixins/style-body'], function (exports, AuthenticatedRoute, CurrentUserSettings, PaginationRouteMixin, styleBody) {

    'use strict';

    var paginationSettings, UsersIndexRoute;

    paginationSettings = {
        page: 1,
        limit: 20,
        status: "active"
    };

    UsersIndexRoute = AuthenticatedRoute['default'].extend(styleBody['default'], CurrentUserSettings['default'], PaginationRouteMixin['default'], {
        titleToken: "Users",

        classNames: ["settings-view-users"],

        setupController: function setupController(controller, model) {
            this._super(controller, model);
            this.setupPagination(paginationSettings);
        },

        beforeModel: function beforeModel() {
            return this.get("session.user").then(this.transitionAuthor());
        },

        model: function model() {
            var self = this;

            return self.store.find("user", { limit: "all", status: "invited" }).then(function () {
                return self.get("session.user").then(function (currentUser) {
                    if (currentUser.get("isEditor")) {
                        // Editors only see authors in the list
                        paginationSettings.role = "Author";
                    }

                    return self.store.filter("user", paginationSettings, function (user) {
                        if (currentUser.get("isEditor")) {
                            return user.get("isAuthor") || user === currentUser;
                        }
                        return true;
                    });
                });
            });
        },

        actions: {
            reload: function reload() {
                this.refresh();
            }
        }
    });

    exports['default'] = UsersIndexRoute;

});
define('ghost/routes/settings/users/user', ['exports', 'ghost/routes/authenticated', 'ghost/mixins/current-user-settings', 'ghost/mixins/style-body'], function (exports, AuthenticatedRoute, CurrentUserSettings, styleBody) {

    'use strict';

    var SettingsUserRoute = AuthenticatedRoute['default'].extend(styleBody['default'], CurrentUserSettings['default'], {
        titleToken: "User",

        classNames: ["settings-view-user"],

        model: function model(params) {
            var self = this;
            // TODO: Make custom user adapter that uses /api/users/:slug endpoint
            // return this.store.find('user', { slug: params.slug });

            // Instead, get all the users and then find by slug
            return this.store.find("user").then(function (result) {
                var user = result.findBy("slug", params.slug);

                if (!user) {
                    return self.transitionTo("error404", "settings/users/" + params.slug);
                }

                return user;
            });
        },

        afterModel: function afterModel(user) {
            var self = this;
            return this.get("session.user").then(function (currentUser) {
                var isOwnProfile = user.get("id") === currentUser.get("id"),
                    isAuthor = currentUser.get("isAuthor"),
                    isEditor = currentUser.get("isEditor");
                if (isAuthor && !isOwnProfile) {
                    self.transitionTo("settings.users.user", currentUser);
                } else if (isEditor && !isOwnProfile && !user.get("isAuthor")) {
                    self.transitionTo("settings.users");
                }
            });
        },

        deactivate: function deactivate() {
            var model = this.modelFor("settings.users.user");

            // we want to revert any unsaved changes on exit
            if (model && model.get("isDirty")) {
                model.rollback();
            }

            this._super();
        },

        actions: {
            save: function save() {
                this.get("controller").send("save");
            }
        }
    });

    exports['default'] = SettingsUserRoute;

});
define('ghost/routes/setup', ['exports', 'ember', 'ghost/mixins/style-body', 'ghost/mixins/loading-indicator'], function (exports, Ember, styleBody, loadingIndicator) {

    'use strict';

    var SetupRoute = Ember['default'].Route.extend(styleBody['default'], loadingIndicator['default'], {
        titleToken: "Setup",

        classNames: ["ghost-setup"],

        // use the beforeModel hook to check to see whether or not setup has been
        // previously completed.  If it has, stop the transition into the setup page.

        beforeModel: function beforeModel() {
            var self = this;

            // If user is logged in, setup has already been completed.
            if (this.get("session").isAuthenticated) {
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
                return;
            }

            // If user is not logged in, check the state of the setup process via the API
            return ic.ajax.request(this.get("ghostPaths.url").api("authentication/setup"), {
                type: "GET"
            }).then(function (result) {
                var setup = result.setup[0].status;

                if (setup) {
                    return self.transitionTo("signin");
                }
            });
        }
    });

    exports['default'] = SetupRoute;

});
define('ghost/routes/signin', ['exports', 'ember', 'ghost/mixins/style-body', 'ghost/mixins/loading-indicator'], function (exports, Ember, styleBody, loadingIndicator) {

    'use strict';

    var SigninRoute = Ember['default'].Route.extend(styleBody['default'], loadingIndicator['default'], {
        titleToken: "Sign In",

        classNames: ["ghost-login"],

        beforeModel: function beforeModel() {
            if (this.get("session").isAuthenticated) {
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        model: function model() {
            return Ember['default'].Object.create({
                identification: "",
                password: ""
            });
        },

        // the deactivate hook is called after a route has been exited.
        deactivate: function deactivate() {
            this._super();

            var controller = this.controllerFor("signin");

            // clear the properties that hold the credentials when we're no longer on the signin screen
            controller.set("model.identification", "");
            controller.set("model.password", "");
        }
    });

    exports['default'] = SigninRoute;

});
define('ghost/routes/signout', ['exports', 'ember', 'ghost/routes/authenticated', 'ghost/mixins/style-body', 'ghost/mixins/loading-indicator'], function (exports, Ember, AuthenticatedRoute, styleBody, loadingIndicator) {

    'use strict';

    var SignoutRoute = AuthenticatedRoute['default'].extend(styleBody['default'], loadingIndicator['default'], {
        titleToken: "Sign Out",

        classNames: ["ghost-signout"],

        afterModel: function afterModel(model, transition) {
            this.notifications.clear();
            if (Ember['default'].canInvoke(transition, "send")) {
                transition.send("invalidateSession");
                transition.abort();
            } else {
                this.send("invalidateSession");
            }
        }
    });

    exports['default'] = SignoutRoute;

});
define('ghost/routes/signup', ['exports', 'ember', 'ghost/mixins/style-body', 'ghost/mixins/loading-indicator'], function (exports, Ember, styleBody, loadingIndicator) {

    'use strict';

    var SignupRoute = Ember['default'].Route.extend(styleBody['default'], loadingIndicator['default'], {
        classNames: ["ghost-signup"],
        beforeModel: function beforeModel() {
            if (this.get("session").isAuthenticated) {
                this.notifications.showWarn("You need to sign out to register as a new user.", { delayed: true });
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        model: (function (_model) {
            var _modelWrapper = function model(_x) {
                return _model.apply(this, arguments);
            };

            _modelWrapper.toString = function () {
                return _model.toString();
            };

            return _modelWrapper;
        })(function (params) {
            var self = this,
                tokenText,
                email,
                model = Ember['default'].Object.create(),
                re = /^(?:[A-Za-z0-9_\-]{4})*(?:[A-Za-z0-9_\-]{2}|[A-Za-z0-9_\-]{3})?$/;

            return new Ember['default'].RSVP.Promise(function (resolve) {
                if (!re.test(params.token)) {
                    self.notifications.showError("Invalid token.", { delayed: true });

                    return resolve(self.transitionTo("signin"));
                }

                tokenText = atob(params.token);
                email = tokenText.split("|")[1];

                model.set("email", email);
                model.set("token", params.token);

                return ic.ajax.request({
                    url: self.get("ghostPaths.url").api("authentication", "invitation"),
                    type: "GET",
                    dataType: "json",
                    data: {
                        email: email
                    }
                }).then(function (response) {
                    if (response && response.invitation && response.invitation[0].valid === false) {
                        self.notifications.showError("The invitation does not exist or is no longer valid.", { delayed: true });

                        return resolve(self.transitionTo("signin"));
                    }

                    resolve(model);
                })["catch"](function () {
                    resolve(model);
                });
            });
        }),

        deactivate: function deactivate() {
            this._super();

            // clear the properties that hold the sensitive data from the controller
            this.controllerFor("signup").setProperties({ email: "", password: "", token: "" });
        }
    });

    exports['default'] = SignupRoute;

});
define('ghost/serializers/application', ['exports', 'ember', 'ember-data'], function (exports, Ember, DS) {

    'use strict';

    var ApplicationSerializer = DS['default'].RESTSerializer.extend({
        serializeIntoHash: function serializeIntoHash(hash, type, record, options) {
            // Our API expects an id on the posted object
            options = options || {};
            options.includeId = true;

            // We have a plural root in the API
            var root = Ember['default'].String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Don't ever pass uuid's
            delete data.uuid;

            hash[root] = [data];
        }
    });

    exports['default'] = ApplicationSerializer;

});
define('ghost/serializers/post', ['exports', 'ember', 'ember-data', 'ghost/serializers/application'], function (exports, Ember, DS, ApplicationSerializer) {

    'use strict';

    var PostSerializer = ApplicationSerializer['default'].extend(DS['default'].EmbeddedRecordsMixin, {
        // settings for the EmbeddedRecordsMixin.
        attrs: {
            tags: { embedded: "always" }
        },

        normalize: function normalize(type, hash) {
            // this is to enable us to still access the raw author_id
            // without requiring an extra get request (since it is an
            // async relationship).
            hash.author_id = hash.author;

            return this._super(type, hash);
        },

        extractSingle: function extractSingle(store, primaryType, payload) {
            var root = this.keyForAttribute(primaryType.typeKey),
                pluralizedRoot = Ember['default'].String.pluralize(primaryType.typeKey);

            // make payload { post: { title: '', tags: [obj, obj], etc. } }.
            // this allows ember-data to pull the embedded tags out again,
            // in the function `updatePayloadWithEmbeddedHasMany` of the
            // EmbeddedRecordsMixin (line: `if (!partial[attribute])`):
            // https://github.com/emberjs/data/blob/master/packages/activemodel-adapter/lib/system/embedded_records_mixin.js#L499
            payload[root] = payload[pluralizedRoot][0];
            delete payload[pluralizedRoot];

            return this._super.apply(this, arguments);
        },

        serializeIntoHash: function serializeIntoHash(hash, type, record, options) {
            options = options || {};
            options.includeId = true;

            // We have a plural root in the API
            var root = Ember['default'].String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Properties that exist on the model but we don't want sent in the payload

            delete data.uuid;
            delete data.html;
            // Inserted locally as a convenience.
            delete data.author_id;
            // Read-only virtual property.
            delete data.url;

            hash[root] = [data];
        }
    });

    exports['default'] = PostSerializer;

});
define('ghost/serializers/setting', ['exports', 'ember', 'ghost/serializers/application'], function (exports, Ember, ApplicationSerializer) {

    'use strict';

    var SettingSerializer = ApplicationSerializer['default'].extend({
        serializeIntoHash: function serializeIntoHash(hash, type, record, options) {
            // Settings API does not want ids
            options = options || {};
            options.includeId = false;

            var root = Ember['default'].String.pluralize(type.typeKey),
                data = this.serialize(record, options),
                payload = [];

            delete data.id;

            Object.keys(data).forEach(function (k) {
                payload.push({ key: k, value: data[k] });
            });

            hash[root] = payload;
        },

        extractArray: function extractArray(store, type, _payload) {
            var payload = { id: "0" };

            _payload.settings.forEach(function (setting) {
                payload[setting.key] = setting.value;
            });

            payload = this.normalize(type, payload);

            return [payload];
        },

        extractSingle: function extractSingle(store, type, payload) {
            return this.extractArray(store, type, payload).pop();
        }
    });

    exports['default'] = SettingSerializer;

});
define('ghost/serializers/tag', ['exports', 'ember', 'ghost/serializers/application'], function (exports, Ember, ApplicationSerializer) {

    'use strict';

    var TagSerializer = ApplicationSerializer['default'].extend({
        serializeIntoHash: function serializeIntoHash(hash, type, record, options) {
            options = options || {};
            options.includeId = true;

            var root = Ember['default'].String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Properties that exist on the model but we don't want sent in the payload

            delete data.uuid;
            delete data.post_count;

            hash[root] = [data];
        }
    });

    exports['default'] = TagSerializer;

});
define('ghost/serializers/user', ['exports', 'ember', 'ember-data', 'ghost/serializers/application'], function (exports, Ember, DS, ApplicationSerializer) {

    'use strict';

    var UserSerializer = ApplicationSerializer['default'].extend(DS['default'].EmbeddedRecordsMixin, {
        attrs: {
            roles: { embedded: "always" }
        },

        extractSingle: function extractSingle(store, primaryType, payload) {
            var root = this.keyForAttribute(primaryType.typeKey),
                pluralizedRoot = Ember['default'].String.pluralize(primaryType.typeKey);

            payload[root] = payload[pluralizedRoot][0];
            delete payload[pluralizedRoot];

            return this._super.apply(this, arguments);
        }
    });

    exports['default'] = UserSerializer;

});
define('ghost/templates/-contributors', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/ErisDS");
        dom.setAttribute(el2,"title","ErisDS");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","ErisDS");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/jaswilli");
        dom.setAttribute(el2,"title","jaswilli");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","jaswilli");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/PaulAdamDavis");
        dom.setAttribute(el2,"title","PaulAdamDavis");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","PaulAdamDavis");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/novaugust");
        dom.setAttribute(el2,"title","novaugust");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","novaugust");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/JohnONolan");
        dom.setAttribute(el2,"title","JohnONolan");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","JohnONolan");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/cobbspur");
        dom.setAttribute(el2,"title","cobbspur");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","cobbspur");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/acburdine");
        dom.setAttribute(el2,"title","acburdine");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","acburdine");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/felixrieseberg");
        dom.setAttribute(el2,"title","felixrieseberg");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","felixrieseberg");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/sebgie");
        dom.setAttribute(el2,"title","sebgie");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","sebgie");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/rwjblue");
        dom.setAttribute(el2,"title","rwjblue");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","rwjblue");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/halfdan");
        dom.setAttribute(el2,"title","halfdan");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","halfdan");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/dbalders");
        dom.setAttribute(el2,"title","dbalders");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","dbalders");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/harryhope");
        dom.setAttribute(el2,"title","harryhope");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","harryhope");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("li");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"href","https://github.com/pborreli");
        dom.setAttribute(el2,"title","pborreli");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("img");
        dom.setAttribute(el3,"alt","pborreli");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1, 1]);
        var element1 = dom.childAt(fragment, [2, 1, 1]);
        var element2 = dom.childAt(fragment, [4, 1, 1]);
        var element3 = dom.childAt(fragment, [6, 1, 1]);
        var element4 = dom.childAt(fragment, [8, 1, 1]);
        var element5 = dom.childAt(fragment, [10, 1, 1]);
        var element6 = dom.childAt(fragment, [12, 1, 1]);
        var element7 = dom.childAt(fragment, [14, 1, 1]);
        var element8 = dom.childAt(fragment, [16, 1, 1]);
        var element9 = dom.childAt(fragment, [18, 1, 1]);
        var element10 = dom.childAt(fragment, [20, 1, 1]);
        var element11 = dom.childAt(fragment, [22, 1, 1]);
        var element12 = dom.childAt(fragment, [24, 1, 1]);
        var element13 = dom.childAt(fragment, [26, 1, 1]);
        var attrMorph0 = dom.createAttrMorph(element0, 'src');
        var attrMorph1 = dom.createAttrMorph(element1, 'src');
        var attrMorph2 = dom.createAttrMorph(element2, 'src');
        var attrMorph3 = dom.createAttrMorph(element3, 'src');
        var attrMorph4 = dom.createAttrMorph(element4, 'src');
        var attrMorph5 = dom.createAttrMorph(element5, 'src');
        var attrMorph6 = dom.createAttrMorph(element6, 'src');
        var attrMorph7 = dom.createAttrMorph(element7, 'src');
        var attrMorph8 = dom.createAttrMorph(element8, 'src');
        var attrMorph9 = dom.createAttrMorph(element9, 'src');
        var attrMorph10 = dom.createAttrMorph(element10, 'src');
        var attrMorph11 = dom.createAttrMorph(element11, 'src');
        var attrMorph12 = dom.createAttrMorph(element12, 'src');
        var attrMorph13 = dom.createAttrMorph(element13, 'src');
        attribute(env, attrMorph0, element0, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/ErisDS"]));
        attribute(env, attrMorph1, element1, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/jaswilli"]));
        attribute(env, attrMorph2, element2, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/PaulAdamDavis"]));
        attribute(env, attrMorph3, element3, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/novaugust"]));
        attribute(env, attrMorph4, element4, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/JohnONolan"]));
        attribute(env, attrMorph5, element5, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/cobbspur"]));
        attribute(env, attrMorph6, element6, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/acburdine"]));
        attribute(env, attrMorph7, element7, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/felixrieseberg"]));
        attribute(env, attrMorph8, element8, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/sebgie"]));
        attribute(env, attrMorph9, element9, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/rwjblue"]));
        attribute(env, attrMorph10, element10, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/halfdan"]));
        attribute(env, attrMorph11, element11, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/dbalders"]));
        attribute(env, attrMorph12, element12, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/harryhope"]));
        attribute(env, attrMorph13, element13, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/contributors"], {}), "/pborreli"]));
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/-import-errors', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("    ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("tr");
            var el2 = dom.createElement("td");
            var el3 = dom.createComment("");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(dom.childAt(fragment, [1, 0]),0,0);
            content(env, morph0, context, "error.message");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("table");
          dom.setAttribute(el1,"class","table");
          var el2 = dom.createTextNode("\n");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [0]),1,1);
          block(env, morph0, context, "each", [get(env, context, "importErrors")], {"keyword": "error"}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "importErrors")], {}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/-navbar', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","nav-label");
          var el2 = dom.createElement("i");
          dom.setAttribute(el2,"class","icon-content");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode(" Content");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","nav-label");
          var el2 = dom.createElement("i");
          dom.setAttribute(el2,"class","icon-add");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode(" New Post");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("        ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("div");
            dom.setAttribute(el1,"class","nav-label");
            var el2 = dom.createElement("i");
            dom.setAttribute(el2,"class","icon-settings2");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode(" Settings");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "link-to", ["settings"], {"classNames": "nav-item nav-settings js-nav-item"}, child0, null);
          return fragment;
        }
      };
    }());
    var child3 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("span");
          dom.setAttribute(el1,"class","image");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("img");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","name");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode(" ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("i");
          dom.setAttribute(el2,"class","icon-chevron-down");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("small");
          var el3 = dom.createTextNode("Profile & Settings");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, attribute = hooks.attribute, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element2 = dom.childAt(fragment, [1]);
          var element3 = dom.childAt(element2, [1]);
          var attrMorph0 = dom.createAttrMorph(element2, 'style');
          var attrMorph1 = dom.createAttrMorph(element3, 'src');
          var attrMorph2 = dom.createAttrMorph(element3, 'title');
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [3]),1,1);
          attribute(env, attrMorph0, element2, "style", get(env, context, "userImageBackground"));
          attribute(env, attrMorph1, element3, "src", get(env, context, "userImage"));
          attribute(env, attrMorph2, element3, "title", get(env, context, "userImageAlt"));
          content(env, morph0, context, "session.user.name");
          return fragment;
        }
      };
    }());
    var child4 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createElement("i");
            dom.setAttribute(el1,"class","icon-user");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode(" Your Profile");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createElement("i");
            dom.setAttribute(el1,"class","icon-power");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode(" Sign Out");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("ul");
          dom.setAttribute(el1,"class","dropdown-menu dropdown-triangle-top-right js-user-menu-dropdown-menu");
          dom.setAttribute(el1,"role","menu");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"role","presentation");
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"class","divider");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"role","presentation");
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element1 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(dom.childAt(element1, [1]),0,0);
          var morph1 = dom.createMorphAt(dom.childAt(element1, [5]),0,0);
          block(env, morph0, context, "link-to", ["settings.users.user", get(env, context, "session.user.slug")], {"classNames": "dropdown-item user-menu-profile js-nav-item", "role": "menuitem", "tabindex": "-1"}, child0, null);
          block(env, morph1, context, "link-to", ["signout"], {"classNames": "dropdown-item user-menu-signout", "role": "menuitem", "tabindex": "-1"}, child1, null);
          return fragment;
        }
      };
    }());
    var child5 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","help-button");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("i");
          dom.setAttribute(el2,"class","icon-question");
          var el3 = dom.createElement("span");
          dom.setAttribute(el3,"class","hidden");
          var el4 = dom.createTextNode("Help");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child6 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("ul");
          dom.setAttribute(el1,"class","dropdown-menu dropdown-triangle-top");
          dom.setAttribute(el1,"role","menu");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"role","presentation");
          var el3 = dom.createElement("a");
          dom.setAttribute(el3,"class","dropdown-item help-menu-support");
          dom.setAttribute(el3,"role","menuitem");
          dom.setAttribute(el3,"tabindex","-1");
          dom.setAttribute(el3,"href","http://support.ghost.org/");
          dom.setAttribute(el3,"target","_blank");
          var el4 = dom.createElement("i");
          dom.setAttribute(el4,"class","icon-support");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode(" Support Center");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"role","presentation");
          var el3 = dom.createElement("a");
          dom.setAttribute(el3,"class","dropdown-item help-menu-tweet");
          dom.setAttribute(el3,"role","menuitem");
          dom.setAttribute(el3,"tabindex","-1");
          dom.setAttribute(el3,"href","https://twitter.com/intent/tweet?text=%40TryGhost+Hi%21+Can+you+help+me+with+&related=TryGhost");
          dom.setAttribute(el3,"target","_blank");
          dom.setAttribute(el3,"onclick","window.open(this.href, 'twitter-share', 'width=550,height=235');return false;");
          var el4 = dom.createElement("i");
          dom.setAttribute(el4,"class","icon-twitter");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode(" Tweet @TryGhost!");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"class","divider");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"role","presentation");
          var el3 = dom.createElement("a");
          dom.setAttribute(el3,"class","dropdown-item help-menu-how-to");
          dom.setAttribute(el3,"role","menuitem");
          dom.setAttribute(el3,"tabindex","-1");
          dom.setAttribute(el3,"href","http://support.ghost.org/how-to-use-ghost/");
          dom.setAttribute(el3,"target","_blank");
          var el4 = dom.createElement("i");
          dom.setAttribute(el4,"class","icon-book");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode(" How to Use Ghost");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"role","presentation");
          var el3 = dom.createElement("a");
          dom.setAttribute(el3,"class","dropdown-item help-menu-markdown");
          dom.setAttribute(el3,"role","menuitem");
          dom.setAttribute(el3,"tabindex","-1");
          dom.setAttribute(el3,"href","");
          var el4 = dom.createElement("i");
          dom.setAttribute(el4,"class","icon-markdown");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode(" Markdown Help");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"class","divider");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"role","presentation");
          var el3 = dom.createElement("a");
          dom.setAttribute(el3,"class","dropdown-item help-menu-wishlist");
          dom.setAttribute(el3,"role","menuitem");
          dom.setAttribute(el3,"tabindex","-1");
          dom.setAttribute(el3,"href","http://ideas.ghost.org/");
          dom.setAttribute(el3,"target","_blank");
          var el4 = dom.createElement("i");
          dom.setAttribute(el4,"class","icon-list");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode(" Wishlist");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1, 9, 0]);
          element(env, element0, context, "action", ["openModal", "markdown"], {});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("nav");
        dom.setAttribute(el1,"class","global-nav");
        dom.setAttribute(el1,"role","navigation");
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("a");
        dom.setAttribute(el2,"class","nav-item ghost-logo");
        dom.setAttribute(el2,"title","Visit blog");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","nav-label");
        var el4 = dom.createElement("i");
        dom.setAttribute(el4,"class","icon-ghost");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode(" ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("span");
        var el5 = dom.createTextNode("Visit blog");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode(" ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","nav-item user-menu");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","nav-item help-menu");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","nav-cover js-nav-cover");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element4 = dom.childAt(fragment, [0]);
        var element5 = dom.childAt(element4, [1]);
        var element6 = dom.childAt(element4, [9]);
        var element7 = dom.childAt(element4, [11]);
        var attrMorph0 = dom.createAttrMorph(element5, 'href');
        var morph0 = dom.createMorphAt(element4,3,3);
        var morph1 = dom.createMorphAt(element4,5,5);
        var morph2 = dom.createMorphAt(element4,7,7);
        var morph3 = dom.createMorphAt(element6,1,1);
        var morph4 = dom.createMorphAt(element6,2,2);
        var morph5 = dom.createMorphAt(element7,1,1);
        var morph6 = dom.createMorphAt(element7,2,2);
        attribute(env, attrMorph0, element5, "href", concat(env, [get(env, context, "config.blogUrl"), "/"]));
        block(env, morph0, context, "link-to", ["posts"], {"classNames": "nav-item nav-content js-nav-item"}, child0, null);
        block(env, morph1, context, "link-to", ["editor.new"], {"classNames": "nav-item nav-new js-nav-item"}, child1, null);
        block(env, morph2, context, "unless", [get(env, context, "session.user.isAuthor")], {}, child2, null);
        block(env, morph3, context, "gh-dropdown-button", [], {"dropdownName": "user-menu", "tagName": "div", "classNames": "nav-label clearfix"}, child3, null);
        block(env, morph4, context, "gh-dropdown", [], {"tagName": "div", "classNames": "dropdown", "name": "user-menu", "closeOnClick": "true"}, child4, null);
        block(env, morph5, context, "gh-dropdown-button", [], {"dropdownName": "help-menu", "tagName": "div", "classNames": "nav-label clearfix"}, child5, null);
        block(env, morph6, context, "gh-dropdown", [], {"tagName": "div", "classNames": "dropdown", "name": "help-menu", "closeOnClick": "true"}, child6, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/-publish-bar', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("footer");
        dom.setAttribute(el1,"id","publish-bar");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","publish-bar-inner");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","publish-bar-actions");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("button");
        dom.setAttribute(el4,"type","button");
        dom.setAttribute(el4,"class","post-settings");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("span");
        dom.setAttribute(el5,"class","sr-only");
        var el6 = dom.createTextNode("Post settings menu");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, inline = hooks.inline, element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1]);
        var element1 = dom.childAt(element0, [3]);
        var element2 = dom.childAt(element1, [1]);
        var morph0 = dom.createMorphAt(element0,1,1);
        var morph1 = dom.createMorphAt(element1,3,3);
        inline(env, morph0, context, "render", ["post-tags-input"], {});
        element(env, element2, context, "action", ["toggleSettingsMenu"], {});
        inline(env, morph1, context, "view", ["editor-save-button"], {"id": "entry-actions", "classNameBindings": "model.isNew:unsaved"});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/-user-actions-menu', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("li");
          var el2 = dom.createElement("button");
          var el3 = dom.createTextNode("Make Owner");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element1 = dom.childAt(fragment, [0, 0]);
          element(env, element1, context, "action", ["openModal", "transfer-owner", get(env, context, "this")], {});
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("li");
          var el2 = dom.createElement("button");
          dom.setAttribute(el2,"class","delete");
          var el3 = dom.createTextNode("Delete User");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [0, 0]);
          element(env, element0, context, "action", ["openModal", "delete-user", get(env, context, "this")], {});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        var morph1 = dom.createMorphAt(fragment,1,1,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "view.canMakeOwner")], {}, child0, null);
        block(env, morph1, context, "if", [get(env, context, "view.deleteUserActionIsVisible")], {}, child1, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/application', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "partial", ["navbar"], {});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("a");
        dom.setAttribute(el1,"class","sr-only sr-only-focusable");
        dom.setAttribute(el1,"href","#gh-main");
        var el2 = dom.createTextNode("Skip to main content");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("main");
        dom.setAttribute(el1,"id","gh-main");
        dom.setAttribute(el1,"class","viewport");
        dom.setAttribute(el1,"role","main");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block, inline = hooks.inline, attribute = hooks.attribute, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [6]);
        var morph0 = dom.createMorphAt(fragment,2,2,contextualElement);
        var morph1 = dom.createMorphAt(fragment,4,4,contextualElement);
        var morph2 = dom.createMorphAt(element0,1,1);
        var morph3 = dom.createMorphAt(element0,3,3);
        var attrMorph0 = dom.createAttrMorph(element0, 'data-notification-count');
        var morph4 = dom.createMorphAt(fragment,8,8,contextualElement);
        var morph5 = dom.createMorphAt(fragment,10,10,contextualElement);
        block(env, morph0, context, "unless", [get(env, context, "hideNav")], {}, child0, null);
        inline(env, morph1, context, "gh-notifications", [], {"location": "top", "notify": "topNotificationChange"});
        attribute(env, attrMorph0, element0, "data-notification-count", get(env, context, "topNotificationCount"));
        content(env, morph2, context, "outlet");
        inline(env, morph3, context, "gh-notifications", [], {"location": "bottom"});
        inline(env, morph4, context, "outlet", ["modal"], {});
        inline(env, morph5, context, "outlet", ["settings-menu"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-activating-list-item', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          var morph1 = dom.createMorphAt(fragment,1,1,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          content(env, morph0, context, "title");
          content(env, morph1, context, "yield");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "link-to", [get(env, context, "route")], {"alternateActive": get(env, context, "active")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-blog-url', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createUnsafeMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        content(env, morph0, context, "config.blogUrl");
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-ed-preview', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, 0);
        inline(env, morph0, context, "gh-format-markdown", [get(env, context, "markdown")], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-file-upload', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("input");
        dom.setAttribute(el1,"data-url","upload");
        dom.setAttribute(el1,"class","btn btn-green");
        dom.setAttribute(el1,"type","file");
        dom.setAttribute(el1,"name","importfile");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("button");
        dom.setAttribute(el1,"type","submit");
        dom.setAttribute(el1,"class","btn btn-blue");
        dom.setAttribute(el1,"id","startupload");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(fragment, [2]);
        var attrMorph0 = dom.createAttrMorph(element0, 'accept');
        var morph0 = dom.createMorphAt(element1,1,1);
        var attrMorph1 = dom.createAttrMorph(element1, 'disabled');
        attribute(env, attrMorph0, element0, "accept", concat(env, [get(env, context, "options.acceptEncoding")]));
        attribute(env, attrMorph1, element1, "disabled", get(env, context, "uploadButtonDisabled"));
        element(env, element1, context, "action", ["upload"], {});
        content(env, morph0, context, "uploadButtonText");
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-modal-dialog', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("header");
          dom.setAttribute(el1,"class","modal-header");
          var el2 = dom.createElement("h1");
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [0, 0]),0,0);
          content(env, morph0, context, "title");
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("a");
          dom.setAttribute(el1,"class","close");
          dom.setAttribute(el1,"href","");
          dom.setAttribute(el1,"title","Close");
          var el2 = dom.createElement("span");
          dom.setAttribute(el2,"class","hidden");
          var el3 = dom.createTextNode("Close");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element3 = dom.childAt(fragment, [0]);
          element(env, element3, context, "action", ["closeModal"], {});
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("footer");
          dom.setAttribute(el1,"class","modal-footer");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("button");
          dom.setAttribute(el2,"type","button");
          var el3 = dom.createTextNode("\n                    ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("\n                Required to strip the white-space between buttons\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("button");
          dom.setAttribute(el2,"type","button");
          var el3 = dom.createTextNode("\n                    ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var element1 = dom.childAt(element0, [1]);
          var element2 = dom.childAt(element0, [3]);
          var morph0 = dom.createMorphAt(element1,1,1);
          var attrMorph0 = dom.createAttrMorph(element1, 'class');
          var morph1 = dom.createMorphAt(element2,1,1);
          var attrMorph1 = dom.createAttrMorph(element2, 'class');
          attribute(env, attrMorph0, element1, "class", concat(env, [get(env, context, "rejectButtonClass"), " js-button-reject"]));
          element(env, element1, context, "action", ["confirm", "reject"], {});
          content(env, morph0, context, "confirm.reject.text");
          attribute(env, attrMorph1, element2, "class", concat(env, [get(env, context, "acceptButtonClass"), " js-button-accept"]));
          element(env, element2, context, "action", ["confirm", "accept"], {});
          content(env, morph1, context, "confirm.accept.text");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","modal-container js-modal-container");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("article");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("section");
        dom.setAttribute(el3,"class","modal-content");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("section");
        dom.setAttribute(el4,"class","modal-body");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","modal-background js-modal-background");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, element = hooks.element, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, block = hooks.block, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element4 = dom.childAt(fragment, [0]);
        var element5 = dom.childAt(element4, [1]);
        var element6 = dom.childAt(element5, [1]);
        var attrMorph0 = dom.createAttrMorph(element5, 'class');
        var morph0 = dom.createMorphAt(element6,1,1);
        var morph1 = dom.createMorphAt(element6,3,3);
        var morph2 = dom.createMorphAt(dom.childAt(element6, [5]),1,1);
        var morph3 = dom.createMorphAt(element6,7,7);
        element(env, element4, context, "action", ["closeModal"], {});
        attribute(env, attrMorph0, element5, "class", concat(env, [get(env, context, "klass"), " js-modal"]));
        element(env, element6, context, "action", ["noBubble"], {"bubbles": false, "preventDefault": false});
        block(env, morph0, context, "if", [get(env, context, "title")], {}, child0, null);
        block(env, morph1, context, "if", [get(env, context, "showClose")], {}, child1, null);
        content(env, morph2, context, "yield");
        block(env, morph3, context, "if", [get(env, context, "confirm")], {}, child2, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-navitem', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("span");
          dom.setAttribute(el1,"class","navigation-item-drag-handle icon-grab");
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("span");
          dom.setAttribute(el2,"class","sr-only");
          var el3 = dom.createTextNode("Reorder");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("button");
          dom.setAttribute(el1,"type","button");
          dom.setAttribute(el1,"class","add-navigation-link icon-add");
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("span");
          dom.setAttribute(el2,"class","sr-only");
          var el3 = dom.createTextNode("Add");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element1 = dom.childAt(fragment, [1]);
          element(env, element1, context, "action", ["addItem"], {});
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("button");
          dom.setAttribute(el1,"type","button");
          dom.setAttribute(el1,"class","navigation-delete icon-trash");
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("span");
          dom.setAttribute(el2,"class","sr-only");
          var el3 = dom.createTextNode("Delete");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          element(env, element0, context, "action", ["deleteItem", get(env, context, "navItem")], {});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","navigation-inputs");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("span");
        dom.setAttribute(el2,"class","navigation-item-label");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("span");
        dom.setAttribute(el2,"class","navigation-item-url");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("span");
        dom.setAttribute(el1,"class","navigation-item-action");
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block, inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element2 = dom.childAt(fragment, [1]);
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        var morph1 = dom.createMorphAt(dom.childAt(element2, [1]),1,1);
        var morph2 = dom.createMorphAt(dom.childAt(element2, [3]),1,1);
        var morph3 = dom.createMorphAt(dom.childAt(fragment, [3]),1,1);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "unless", [get(env, context, "navItem.last")], {}, child0, null);
        inline(env, morph1, context, "gh-trim-focus-input", [], {"focus": get(env, context, "navItem.last"), "placeholder": "Label", "value": get(env, context, "navItem.label")});
        inline(env, morph2, context, "gh-navitem-url-input", [], {"baseUrl": get(env, context, "baseUrl"), "url": get(env, context, "navItem.url"), "last": get(env, context, "navItem.last"), "change": "updateUrl"});
        block(env, morph3, context, "if", [get(env, context, "navItem.last")], {}, child1, child2);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-notification', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("section");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("span");
        dom.setAttribute(el2,"class","notification-message");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("button");
        dom.setAttribute(el2,"class","close");
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","hidden");
        var el4 = dom.createTextNode("Close");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, content = hooks.content, element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(element0, [3]);
        var attrMorph0 = dom.createAttrMorph(element0, 'class');
        var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),1,1);
        attribute(env, attrMorph0, element0, "class", concat(env, ["js-notification ", get(env, context, "typeClass")]));
        content(env, morph0, context, "message.message");
        element(env, element1, context, "action", ["closeNotification"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-notifications', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-notification", [], {"message": get(env, context, "message")});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "each", [get(env, context, "messages")], {"keyword": "message"}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-role-selector', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("option");
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, attribute = hooks.attribute, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [0]);
          var morph0 = dom.createMorphAt(element0,0,0);
          var attrMorph0 = dom.createAttrMorph(element0, 'value');
          attribute(env, attrMorph0, element0, "value", get(env, context, "role.id"));
          content(env, morph0, context, "role.name");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("select");
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element1 = dom.childAt(fragment, [0]);
        var morph0 = dom.createMorphAt(element1,1,1);
        var attrMorph0 = dom.createAttrMorph(element1, 'id');
        var attrMorph1 = dom.createAttrMorph(element1, 'name');
        attribute(env, attrMorph0, element1, "id", concat(env, [get(env, context, "selectId")]));
        attribute(env, attrMorph1, element1, "name", concat(env, [get(env, context, "selectName")]));
        block(env, morph0, context, "each", [get(env, context, "roles")], {"keyword": "role"}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-uploader', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("span");
        dom.setAttribute(el1,"class","media");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("span");
        dom.setAttribute(el2,"class","hidden");
        var el3 = dom.createTextNode("Image Upload");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("img");
        dom.setAttribute(el1,"class","js-upload-target");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","description");
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("strong");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("input");
        dom.setAttribute(el1,"data-url","upload");
        dom.setAttribute(el1,"class","js-fileupload main fileupload");
        dom.setAttribute(el1,"type","file");
        dom.setAttribute(el1,"name","uploadimage");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [2]);
        var attrMorph0 = dom.createAttrMorph(element0, 'src');
        var morph0 = dom.createMorphAt(dom.childAt(fragment, [4]),0,0);
        attribute(env, attrMorph0, element0, "src", concat(env, [get(env, context, "imageSource")]));
        content(env, morph0, context, "description");
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/components/gh-url-preview', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, 0);
        content(env, morph0, context, "url");
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/editor-save-button', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("i");
          dom.setAttribute(el1,"class","options");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("span");
          dom.setAttribute(el1,"class","sr-only");
          var el2 = dom.createTextNode("Toggle Settings Menu");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("ul");
          dom.setAttribute(el1,"class","dropdown-menu dropdown-triangle-bottom-right");
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("a");
          dom.setAttribute(el3,"href","#");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("a");
          dom.setAttribute(el3,"href","#");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"class","divider delete");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("li");
          dom.setAttribute(el2,"class","delete");
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("a");
          dom.setAttribute(el3,"href","#");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var element1 = dom.childAt(element0, [1]);
          var element2 = dom.childAt(element1, [1]);
          var element3 = dom.childAt(element0, [3]);
          var element4 = dom.childAt(element3, [1]);
          var element5 = dom.childAt(element0, [7, 1]);
          var attrMorph0 = dom.createAttrMorph(element1, 'class');
          var morph0 = dom.createMorphAt(element2,0,0);
          var attrMorph1 = dom.createAttrMorph(element3, 'class');
          var morph1 = dom.createMorphAt(element4,0,0);
          var morph2 = dom.createMorphAt(element5,0,0);
          attribute(env, attrMorph0, element1, "class", concat(env, ["post-save-publish ", subexpr(env, context, "if", [get(env, context, "willPublish"), "active"], {})]));
          element(env, element2, context, "action", ["setSaveType", "publish"], {});
          content(env, morph0, context, "view.publishText");
          attribute(env, attrMorph1, element3, "class", concat(env, ["post-save-draft ", subexpr(env, context, "unless", [get(env, context, "willPublish"), "active"], {})]));
          element(env, element4, context, "action", ["setSaveType", "draft"], {});
          content(env, morph1, context, "view.draftText");
          element(env, element5, context, "action", ["openModal", "delete-post", get(env, context, "this")], {});
          content(env, morph2, context, "view.deleteText");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("button");
        dom.setAttribute(el1,"type","button");
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, content = hooks.content, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element6 = dom.childAt(fragment, [0]);
        var morph0 = dom.createMorphAt(element6,0,0);
        var attrMorph0 = dom.createAttrMorph(element6, 'class');
        var morph1 = dom.createMorphAt(fragment,2,2,contextualElement);
        var morph2 = dom.createMorphAt(fragment,3,3,contextualElement);
        dom.insertBoundary(fragment, null);
        attribute(env, attrMorph0, element6, "class", concat(env, ["btn btn-sm js-publish-button ", subexpr(env, context, "if", [get(env, context, "view.isDangerous"), "btn-red", "btn-blue"], {})]));
        element(env, element6, context, "action", ["save"], {});
        content(env, morph0, context, "view.saveText");
        block(env, morph1, context, "gh-dropdown-button", [], {"dropdownName": "post-save-menu", "classNameBindings": ":btn :btn-sm view.isDangerous:btn-red:btn-blue btnopen:active :dropdown-toggle :up"}, child0, null);
        block(env, morph2, context, "gh-dropdown", [], {"name": "post-save-menu", "closeOnClick": "true", "tagName": "div", "classNames": "dropdown editor-options"}, child1, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/editor/edit', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","page-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("button");
        dom.setAttribute(el2,"class","menu-button js-menu-button");
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","sr-only");
        var el4 = dom.createTextNode("Menu");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("Editor");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","page-content");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("header");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("section");
        dom.setAttribute(el3,"class","box entry-title");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("header");
        dom.setAttribute(el3,"class","floatingheader");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("small");
        var el5 = dom.createTextNode("Markdown");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4,"class","markdown-help");
        dom.setAttribute(el4,"href","");
        var el5 = dom.createElement("span");
        dom.setAttribute(el5,"class","hidden");
        var el6 = dom.createTextNode("What is Markdown?");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("section");
        dom.setAttribute(el3,"id","entry-markdown-content");
        dom.setAttribute(el3,"class","entry-markdown-content");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("header");
        dom.setAttribute(el3,"class","floatingheader");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("small");
        var el5 = dom.createTextNode("Preview ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("span");
        dom.setAttribute(el5,"class","entry-word-count js-entry-word-count");
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("section");
        dom.setAttribute(el3,"class","entry-preview-content js-entry-preview-content");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, element = hooks.element, get = hooks.get, inline = hooks.inline, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1]);
        var element1 = dom.childAt(fragment, [2]);
        var element2 = dom.childAt(element1, [3]);
        var element3 = dom.childAt(element2, [1]);
        var element4 = dom.childAt(element3, [3]);
        var element5 = dom.childAt(element1, [5]);
        var element6 = dom.childAt(element5, [1]);
        var morph0 = dom.createMorphAt(dom.childAt(element1, [1, 1]),1,1);
        var attrMorph0 = dom.createAttrMorph(element2, 'class');
        var morph1 = dom.createMorphAt(dom.childAt(element2, [3]),1,1);
        var attrMorph1 = dom.createAttrMorph(element5, 'class');
        var morph2 = dom.createMorphAt(dom.childAt(element6, [1, 1]),0,0);
        var morph3 = dom.createMorphAt(dom.childAt(element5, [3]),1,1);
        var morph4 = dom.createMorphAt(element1,7,7);
        element(env, element0, context, "action", ["toggleGlobalMobileNav"], {});
        inline(env, morph0, context, "gh-trim-focus-input", [], {"type": "text", "id": "entry-title", "placeholder": "Your Post Title", "value": get(env, context, "model.titleScratch"), "tabindex": "1", "focus": get(env, context, "shouldFocusTitle")});
        attribute(env, attrMorph0, element2, "class", concat(env, ["entry-markdown js-entry-markdown ", subexpr(env, context, "unless", [get(env, context, "isPreview"), "active"], {})]));
        element(env, element3, context, "action", ["togglePreview", false], {});
        element(env, element4, context, "action", ["openModal", "markdown"], {});
        inline(env, morph1, context, "gh-ed-editor", [], {"classNames": "markdown-editor js-markdown-editor", "tabindex": "1", "spellcheck": "true", "value": get(env, context, "model.scratch"), "scrollInfo": get(env, context, "view.editorScrollInfo"), "focus": get(env, context, "shouldFocusEditor"), "focusCursorAtEnd": get(env, context, "model.isDirty"), "setEditor": "setEditor", "openModal": "openModal", "onFocusIn": "autoSaveNew"});
        attribute(env, attrMorph1, element5, "class", concat(env, ["entry-preview js-entry-preview ", subexpr(env, context, "if", [get(env, context, "isPreview"), "active"], {})]));
        element(env, element6, context, "action", ["togglePreview", true], {});
        inline(env, morph2, context, "gh-count-words", [get(env, context, "model.scratch")], {});
        inline(env, morph3, context, "gh-ed-preview", [], {"classNames": "rendered-markdown js-rendered-markdown", "markdown": get(env, context, "model.scratch"), "scrollPosition": get(env, context, "view.scrollPosition"), "height": get(env, context, "view.height"), "uploadStarted": "disableEditor", "uploadFinished": "enableEditor", "uploadSuccess": "handleImgUpload"});
        inline(env, morph4, context, "partial", ["publish-bar"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/error', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createElement("em");
              dom.setAttribute(el1,"class","error-stack-function");
              var el2 = dom.createComment("");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(dom.childAt(fragment, [0]),0,0);
              content(env, morph0, context, "item.function");
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("li");
            var el2 = dom.createTextNode("\n                    at\n                    ");
            dom.appendChild(el1, el2);
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                    ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("span");
            dom.setAttribute(el2,"class","error-stack-file");
            var el3 = dom.createTextNode("(");
            dom.appendChild(el2, el3);
            var el3 = dom.createComment("");
            dom.appendChild(el2, el3);
            var el3 = dom.createTextNode(")");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element0 = dom.childAt(fragment, [1]);
            var morph0 = dom.createMorphAt(element0,1,1);
            var morph1 = dom.createMorphAt(dom.childAt(element0, [3]),1,1);
            block(env, morph0, context, "if", [get(env, context, "item.function")], {}, child0, null);
            content(env, morph1, context, "item.at");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("section");
          dom.setAttribute(el1,"class","error-stack");
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("h3");
          var el3 = dom.createTextNode("Stack Trace");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("p");
          var el3 = dom.createElement("strong");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("ul");
          dom.setAttribute(el2,"class","error-stack-list");
          var el3 = dom.createTextNode("\n");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("        ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element1 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(dom.childAt(element1, [3, 0]),0,0);
          var morph1 = dom.createMorphAt(dom.childAt(element1, [5]),1,1);
          content(env, morph0, context, "message");
          block(env, morph1, context, "each", [get(env, context, "stack")], {"keyword": "item"}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","error-content error-404 js-error-container");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","error-details");
        var el3 = dom.createTextNode("\n         ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("figure");
        dom.setAttribute(el3,"class","error-image");
        var el4 = dom.createTextNode("\n             ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("img");
        dom.setAttribute(el4,"class","error-ghost");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n         ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n         ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("section");
        dom.setAttribute(el3,"class","error-message");
        var el4 = dom.createTextNode("\n             ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("h1");
        dom.setAttribute(el4,"class","error-code");
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n             ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("h2");
        dom.setAttribute(el4,"class","error-description");
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n             ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4,"class","error-link");
        var el5 = dom.createTextNode("Go to the front page →");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n         ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, content = hooks.content, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element2 = dom.childAt(fragment, [0, 1]);
        var element3 = dom.childAt(element2, [1, 1]);
        var element4 = dom.childAt(element2, [3]);
        var element5 = dom.childAt(element4, [5]);
        var attrMorph0 = dom.createAttrMorph(element3, 'src');
        var attrMorph1 = dom.createAttrMorph(element3, 'srcset');
        var morph0 = dom.createMorphAt(dom.childAt(element4, [1]),0,0);
        var morph1 = dom.createMorphAt(dom.childAt(element4, [3]),0,0);
        var attrMorph2 = dom.createAttrMorph(element5, 'href');
        var morph2 = dom.createMorphAt(fragment,2,2,contextualElement);
        dom.insertBoundary(fragment, null);
        attribute(env, attrMorph0, element3, "src", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/404-ghost@2x.png"], {})]));
        attribute(env, attrMorph1, element3, "srcset", concat(env, [subexpr(env, context, "gh-path", ["admin", "/img/404-ghost.png"], {}), " 1x, ", subexpr(env, context, "gh-path", ["admin", "/img/404-ghost@2x.png"], {}), " 2x"]));
        content(env, morph0, context, "code");
        content(env, morph1, context, "message");
        attribute(env, attrMorph2, element5, "href", concat(env, [subexpr(env, context, "gh-path", ["blog"], {})]));
        block(env, morph2, context, "if", [get(env, context, "stack")], {}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/forgotten', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","forgotten-box js-forgotten-box fade-in");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","forgotten");
        dom.setAttribute(el2,"class","forgotten-form");
        dom.setAttribute(el2,"method","post");
        dom.setAttribute(el2,"novalidate","novalidate");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","email-wrap");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"class","btn btn-blue");
        dom.setAttribute(el3,"type","submit");
        var el4 = dom.createTextNode("Send new password");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, inline = hooks.inline, attribute = hooks.attribute, element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1]);
        var element1 = dom.childAt(element0, [3]);
        var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),1,1);
        var attrMorph0 = dom.createAttrMorph(element1, 'disabled');
        inline(env, morph0, context, "gh-trim-focus-input", [], {"value": get(env, context, "email"), "class": "email", "type": "email", "placeholder": "Email Address", "name": "email", "autofocus": "autofocus", "autocapitalize": "off", "autocorrect": "off"});
        attribute(env, attrMorph0, element1, "disabled", get(env, context, "submitting"));
        element(env, element1, context, "action", ["submit"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/copy-html', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "textarea", [], {"value": get(env, context, "generatedHTML"), "rows": "6"});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "type": "action", "title": "Generated HTML", "confirm": get(env, context, "confirm"), "class": "copy-html"}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/delete-all', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("p");
          var el2 = dom.createTextNode("This is permanent! No backups, no restores, no magic undo button. ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("br");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode(" We warned you, ok?");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "type": "action", "style": "wide", "title": "Would you really like to delete all content from your blog?", "confirm": get(env, context, "confirm")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/delete-post', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("p");
          var el2 = dom.createTextNode("You're about to delete \"");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("strong");
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\".");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("br");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("This is permanent! No backups, no restores, no magic undo button. ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("br");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode(" We warned you, ok?");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [1, 1]),0,0);
          content(env, morph0, context, "model.title");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "type": "action", "style": "wide", "title": "Are you sure you want to delete this post?", "confirm": get(env, context, "confirm")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/delete-tag', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("        ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("strong");
            var el2 = dom.createTextNode("WARNING:");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode(" ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("span");
            dom.setAttribute(el1,"class","red");
            var el2 = dom.createTextNode("This tag is attached to ");
            dom.appendChild(el1, el2);
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode(" ");
            dom.appendChild(el1, el2);
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode(".");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode(" You're about to delete \"");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("strong");
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\". This is permanent! No backups, no restores, no magic undo button. We warned you, ok?\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element0 = dom.childAt(fragment, [3]);
            var morph0 = dom.createMorphAt(element0,1,1);
            var morph1 = dom.createMorphAt(element0,3,3);
            var morph2 = dom.createMorphAt(dom.childAt(fragment, [5]),0,0);
            content(env, morph0, context, "model.post_count");
            content(env, morph1, context, "postInflection");
            content(env, morph2, context, "model.name");
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("        ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("strong");
            var el2 = dom.createTextNode("WARNING:");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode(" You're about to delete \"");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("strong");
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\". This is permanent! No backups, no restores, no magic undo button. We warned you, ok?\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(dom.childAt(fragment, [3]),0,0);
            content(env, morph0, context, "model.name");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          dom.insertBoundary(fragment, null);
          block(env, morph0, context, "if", [get(env, context, "model.post_count")], {}, child0, child1);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "type": "action", "style": "wide", "title": "Are you sure you want to delete this tag?", "confirm": get(env, context, "confirm")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/delete-user', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("            ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("strong");
              var el2 = dom.createTextNode("WARNING:");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode(" ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("span");
              dom.setAttribute(el1,"class","red");
              var el2 = dom.createTextNode("This user is the author of ");
              dom.appendChild(el1, el2);
              var el2 = dom.createComment("");
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode(" ");
              dom.appendChild(el1, el2);
              var el2 = dom.createComment("");
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode(".");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode(" All posts and user data will be deleted. There is no way to recover this.\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var element0 = dom.childAt(fragment, [3]);
              var morph0 = dom.createMorphAt(element0,1,1);
              var morph1 = dom.createMorphAt(element0,3,3);
              content(env, morph0, context, "userPostCount.count");
              content(env, morph1, context, "userPostCount.inflection");
              return fragment;
            }
          };
        }());
        var child1 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("            ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("strong");
              var el2 = dom.createTextNode("WARNING:");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode(" All user data will be deleted. There is no way to recover this.\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            block(env, morph0, context, "if", [get(env, context, "userPostCount.count")], {}, child0, child1);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          block(env, morph0, context, "unless", [get(env, context, "userPostCount.isPending")], {}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "type": "action", "style": "wide", "title": "Are you sure you want to delete this user?", "confirm": get(env, context, "confirm")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/invite-new-user', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("fieldset");
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","form-group");
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("label");
          dom.setAttribute(el3,"for","new-user-email");
          var el4 = dom.createTextNode("Email Address");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","form-group for-select");
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("label");
          dom.setAttribute(el3,"for","new-user-role");
          var el4 = dom.createTextNode("Role");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n\n        ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),3,3);
          var morph1 = dom.createMorphAt(dom.childAt(element0, [3]),3,3);
          inline(env, morph0, context, "input", [], {"action": "confirmAccept", "class": "email", "id": "new-user-email", "type": "email", "placeholder": "Email Address", "name": "email", "autofocus": "autofocus", "autocapitalize": "off", "autocorrect": "off", "value": get(env, context, "email")});
          inline(env, morph1, context, "gh-role-selector", [], {"initialValue": get(env, context, "authorRole"), "onChange": "setRole", "selectId": "new-user-role"});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "type": "action", "title": "Invite a New User", "confirm": get(env, context, "confirm"), "class": "invite-new-user"}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/leave-editor', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("p");
          var el2 = dom.createTextNode("Hey there! It looks like you're in the middle of writing something and you haven't saved all of your\n    content.");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("p");
          var el2 = dom.createTextNode("Save before you go!");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "type": "action", "style": "wide", "title": "Are you sure you want to leave this page?", "confirm": get(env, context, "confirm")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/markdown', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("section");
          dom.setAttribute(el1,"class","markdown-help-container");
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("table");
          dom.setAttribute(el2,"class","modal-markdown-help-table");
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("thead");
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("th");
          var el6 = dom.createTextNode("Result");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("th");
          var el6 = dom.createTextNode("Markdown");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("th");
          var el6 = dom.createTextNode("Shortcut");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("tbody");
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createElement("strong");
          var el7 = dom.createTextNode("Bold");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("**text**");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl/⌘ + B ");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createElement("em");
          var el7 = dom.createTextNode("Emphasize");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("*text*");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl/⌘ + I");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createElement("del");
          var el7 = dom.createTextNode("Strike-through");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("~~text~~");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl + Alt + U");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createElement("a");
          dom.setAttribute(el6,"href","#");
          var el7 = dom.createTextNode("Link");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("[title](http://)");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl/⌘ + K");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createElement("code");
          var el7 = dom.createTextNode("Inline Code");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("`code`");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl/⌘ + Shift + K");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Image");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("![alt](http://)");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl/⌘ + Shift + I");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("List");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("* item");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl + L");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Blockquote");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("> quote");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl + Q");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createElement("mark");
          var el7 = dom.createTextNode("Highlight");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("==Highlight==");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("H1");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("# Heading");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("H2");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("## Heading");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl/⌘ + H");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("tr");
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("H3");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("### Heading");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("td");
          var el6 = dom.createTextNode("Ctrl/⌘ + H (x2)");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        For further Markdown syntax reference: ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("a");
          dom.setAttribute(el2,"href","http://support.ghost.org/markdown-guide/");
          dom.setAttribute(el2,"target","_blank");
          var el3 = dom.createTextNode("Markdown Documentation");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "style": "wide", "title": "Markdown Help"}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/signin', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("form");
          dom.setAttribute(el1,"id","login");
          dom.setAttribute(el1,"class","login-form");
          dom.setAttribute(el1,"method","post");
          dom.setAttribute(el1,"novalidate","novalidate");
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","password-wrap");
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("button");
          dom.setAttribute(el2,"class","btn btn-blue");
          dom.setAttribute(el2,"type","submit");
          var el3 = dom.createTextNode("Log in");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n       ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, element = hooks.element, get = hooks.get, inline = hooks.inline, attribute = hooks.attribute;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var element1 = dom.childAt(element0, [3]);
          var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),1,1);
          var attrMorph0 = dom.createAttrMorph(element1, 'disabled');
          element(env, element0, context, "action", ["validateAndAuthenticate"], {"on": "submit"});
          inline(env, morph0, context, "input", [], {"class": "password", "type": "password", "placeholder": "Password", "name": "password", "value": get(env, context, "password")});
          attribute(env, attrMorph0, element1, "disabled", get(env, context, "submitting"));
          element(env, element1, context, "action", ["validateAndAuthenticate"], {});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "type": "action", "style": "wide", "animation": "fade", "title": "Please re-authenticate", "confirm": get(env, context, "confirm")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/transfer-owner', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("p");
          var el2 = dom.createTextNode("Are you sure you want to transfer the ownership of this blog? You will not be able to undo this action.");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-modal-dialog", [], {"action": "closeModal", "showClose": true, "type": "action", "style": "wide", "title": "Transfer Ownership", "confirm": get(env, context, "confirm")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/modals/upload', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("section");
          dom.setAttribute(el1,"class","js-drop-zone");
          var el2 = dom.createTextNode("\n      ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("img");
          dom.setAttribute(el2,"class","js-upload-target");
          dom.setAttribute(el2,"alt","logo");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n      ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("input");
          dom.setAttribute(el2,"data-url","upload");
          dom.setAttribute(el2,"class","js-fileupload main");
          dom.setAttribute(el2,"type","file");
          dom.setAttribute(el2,"name","uploadimage");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var element1 = dom.childAt(element0, [1]);
          var element2 = dom.childAt(element0, [3]);
          var attrMorph0 = dom.createAttrMorph(element1, 'src');
          var attrMorph1 = dom.createAttrMorph(element2, 'accept');
          attribute(env, attrMorph0, element1, "src", concat(env, [get(env, context, "src")]));
          attribute(env, attrMorph1, element2, "accept", concat(env, [get(env, context, "acceptEncoding")]));
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "gh-upload-modal", [], {"action": "closeModal", "close": true, "type": "action", "style": "wide", "model": get(env, context, "model"), "imageType": get(env, context, "imageType")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/post-settings-menu', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("a");
            dom.setAttribute(el1,"class","post-view-link");
            dom.setAttribute(el1,"target","_blank");
            var el2 = dom.createTextNode("\n                    View post ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("i");
            dom.setAttribute(el2,"class","icon-external");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element6 = dom.childAt(fragment, [1]);
            var attrMorph0 = dom.createAttrMorph(element6, 'href');
            attribute(env, attrMorph0, element6, "href", concat(env, [get(env, context, "model.absoluteUrl")]));
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("a");
            dom.setAttribute(el1,"class","post-view-link");
            dom.setAttribute(el1,"target","_blank");
            var el2 = dom.createTextNode("\n                    Preview ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("i");
            dom.setAttribute(el2,"class","icon-external");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element5 = dom.childAt(fragment, [1]);
            var attrMorph0 = dom.createAttrMorph(element5, 'href');
            attribute(env, attrMorph0, element5, "href", concat(env, [get(env, context, "model.previewUrl")]));
            return fragment;
          }
        };
      }());
      var child2 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("            ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("div");
            dom.setAttribute(el1,"class","form-group for-select");
            var el2 = dom.createTextNode("\n                ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("label");
            dom.setAttribute(el2,"for","author-list");
            var el3 = dom.createTextNode("Author");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("span");
            dom.setAttribute(el2,"class","input-icon icon-user");
            var el3 = dom.createTextNode("\n                    ");
            dom.appendChild(el2, el3);
            var el3 = dom.createElement("span");
            dom.setAttribute(el3,"class","gh-select");
            dom.setAttribute(el3,"tabindex","0");
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createComment("");
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            dom.appendChild(el2, el3);
            var el3 = dom.createTextNode("\n                ");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n            ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(dom.childAt(fragment, [1, 3, 1]),1,1);
            inline(env, morph0, context, "view", ["select"], {"name": "post-setting-author", "id": "author-list", "content": get(env, context, "authors"), "optionValuePath": "content.id", "optionLabelPath": "content.name", "selection": get(env, context, "selectedAuthor")});
            return fragment;
          }
        };
      }());
      var child3 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                    ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("button");
            dom.setAttribute(el1,"type","button");
            var el2 = dom.createTextNode("\n                        ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("b");
            var el3 = dom.createTextNode("Meta Data");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                        ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("span");
            var el3 = dom.createTextNode("Extra content for SEO and social media.");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                    ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            return fragment;
          }
        };
      }());
      var child4 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("        ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("div");
              dom.setAttribute(el1,"class","settings-menu-header subview");
              var el2 = dom.createTextNode("\n            ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("button");
              dom.setAttribute(el2,"class","back icon-chevron-left settings-menu-header-action");
              var el3 = dom.createElement("span");
              dom.setAttribute(el3,"class","hidden");
              var el4 = dom.createTextNode("Back");
              dom.appendChild(el3, el4);
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n            ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("h4");
              var el3 = dom.createTextNode("Meta Data");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n        ");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n\n        ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("div");
              dom.setAttribute(el1,"class","settings-menu-content");
              var el2 = dom.createTextNode("\n            ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("form");
              var el3 = dom.createTextNode("\n            ");
              dom.appendChild(el2, el3);
              var el3 = dom.createElement("div");
              dom.setAttribute(el3,"class","form-group");
              var el4 = dom.createTextNode("\n                ");
              dom.appendChild(el3, el4);
              var el4 = dom.createElement("label");
              dom.setAttribute(el4,"for","meta-title");
              var el5 = dom.createTextNode("Meta Title");
              dom.appendChild(el4, el5);
              dom.appendChild(el3, el4);
              var el4 = dom.createTextNode("\n                ");
              dom.appendChild(el3, el4);
              var el4 = dom.createComment("");
              dom.appendChild(el3, el4);
              var el4 = dom.createTextNode("\n                ");
              dom.appendChild(el3, el4);
              var el4 = dom.createElement("p");
              var el5 = dom.createTextNode("Recommended: ");
              dom.appendChild(el4, el5);
              var el5 = dom.createElement("b");
              var el6 = dom.createTextNode("70");
              dom.appendChild(el5, el6);
              dom.appendChild(el4, el5);
              var el5 = dom.createTextNode(" characters. You’ve used ");
              dom.appendChild(el4, el5);
              var el5 = dom.createComment("");
              dom.appendChild(el4, el5);
              dom.appendChild(el3, el4);
              var el4 = dom.createTextNode("\n            ");
              dom.appendChild(el3, el4);
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("\n\n            ");
              dom.appendChild(el2, el3);
              var el3 = dom.createElement("div");
              dom.setAttribute(el3,"class","form-group");
              var el4 = dom.createTextNode("\n                ");
              dom.appendChild(el3, el4);
              var el4 = dom.createElement("label");
              dom.setAttribute(el4,"for","meta-description");
              var el5 = dom.createTextNode("Meta Description");
              dom.appendChild(el4, el5);
              dom.appendChild(el3, el4);
              var el4 = dom.createTextNode("\n                ");
              dom.appendChild(el3, el4);
              var el4 = dom.createComment("");
              dom.appendChild(el3, el4);
              var el4 = dom.createTextNode("\n                ");
              dom.appendChild(el3, el4);
              var el4 = dom.createElement("p");
              var el5 = dom.createTextNode("Recommended: ");
              dom.appendChild(el4, el5);
              var el5 = dom.createElement("b");
              var el6 = dom.createTextNode("156");
              dom.appendChild(el5, el6);
              dom.appendChild(el4, el5);
              var el5 = dom.createTextNode(" characters. You’ve used ");
              dom.appendChild(el4, el5);
              var el5 = dom.createComment("");
              dom.appendChild(el4, el5);
              dom.appendChild(el3, el4);
              var el4 = dom.createTextNode("\n            ");
              dom.appendChild(el3, el4);
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("\n\n            ");
              dom.appendChild(el2, el3);
              var el3 = dom.createElement("div");
              dom.setAttribute(el3,"class","form-group");
              var el4 = dom.createTextNode("\n                ");
              dom.appendChild(el3, el4);
              var el4 = dom.createElement("label");
              var el5 = dom.createTextNode("Search Engine Result Preview");
              dom.appendChild(el4, el5);
              dom.appendChild(el3, el4);
              var el4 = dom.createTextNode("\n                ");
              dom.appendChild(el3, el4);
              var el4 = dom.createElement("div");
              dom.setAttribute(el4,"class","seo-preview");
              var el5 = dom.createTextNode("\n                    ");
              dom.appendChild(el4, el5);
              var el5 = dom.createElement("div");
              dom.setAttribute(el5,"class","seo-preview-title");
              var el6 = dom.createComment("");
              dom.appendChild(el5, el6);
              dom.appendChild(el4, el5);
              var el5 = dom.createTextNode("\n                    ");
              dom.appendChild(el4, el5);
              var el5 = dom.createElement("div");
              dom.setAttribute(el5,"class","seo-preview-link");
              var el6 = dom.createComment("");
              dom.appendChild(el5, el6);
              dom.appendChild(el4, el5);
              var el5 = dom.createTextNode("\n                    ");
              dom.appendChild(el4, el5);
              var el5 = dom.createElement("div");
              dom.setAttribute(el5,"class","seo-preview-description");
              var el6 = dom.createComment("");
              dom.appendChild(el5, el6);
              dom.appendChild(el4, el5);
              var el5 = dom.createTextNode("\n                ");
              dom.appendChild(el4, el5);
              dom.appendChild(el3, el4);
              var el4 = dom.createTextNode("\n            ");
              dom.appendChild(el3, el4);
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("\n            ");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n        ");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, element = hooks.element, get = hooks.get, inline = hooks.inline, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var element0 = dom.childAt(fragment, [1, 1]);
              var element1 = dom.childAt(fragment, [3, 1]);
              var element2 = dom.childAt(element1, [1]);
              var element3 = dom.childAt(element1, [3]);
              var element4 = dom.childAt(element1, [5, 3]);
              var morph0 = dom.createMorphAt(element2,3,3);
              var morph1 = dom.createMorphAt(dom.childAt(element2, [5]),3,3);
              var morph2 = dom.createMorphAt(element3,3,3);
              var morph3 = dom.createMorphAt(dom.childAt(element3, [5]),3,3);
              var morph4 = dom.createMorphAt(dom.childAt(element4, [1]),0,0);
              var morph5 = dom.createMorphAt(dom.childAt(element4, [3]),0,0);
              var morph6 = dom.createMorphAt(dom.childAt(element4, [5]),0,0);
              element(env, element0, context, "action", ["closeSubview"], {});
              inline(env, morph0, context, "gh-input", [], {"class": "post-setting-meta-title", "id": "meta-title", "value": get(env, context, "metaTitleScratch"), "name": "post-setting-meta-title", "focus-out": "setMetaTitle", "stopEnterKeyDownPropagation": "true"});
              inline(env, morph1, context, "gh-count-down-characters", [get(env, context, "metaTitleScratch"), 70], {});
              inline(env, morph2, context, "gh-textarea", [], {"class": "post-setting-meta-description", "id": "meta-description", "value": get(env, context, "metaDescriptionScratch"), "name": "post-setting-meta-description", "focus-out": "setMetaDescription", "stopEnterKeyDownPropagation": "true"});
              inline(env, morph3, context, "gh-count-down-characters", [get(env, context, "metaDescriptionScratch"), 156], {});
              content(env, morph4, context, "seoTitle");
              content(env, morph5, context, "seoURL");
              content(env, morph6, context, "seoDescription");
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            block(env, morph0, context, "if", [get(env, context, "isViewingSubview")], {}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"id","entry-controls");
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("div");
          dom.setAttribute(el3,"class","settings-menu-header");
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("h4");
          var el5 = dom.createTextNode("Post Settings");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("button");
          dom.setAttribute(el4,"class","close icon-x settings-menu-header-action");
          var el5 = dom.createElement("span");
          dom.setAttribute(el5,"class","hidden");
          var el6 = dom.createTextNode("Close");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n        ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("div");
          dom.setAttribute(el3,"class","settings-menu-content");
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("form");
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("div");
          dom.setAttribute(el5,"class","form-group");
          var el6 = dom.createTextNode("\n                ");
          dom.appendChild(el5, el6);
          var el6 = dom.createElement("label");
          dom.setAttribute(el6,"for","url");
          var el7 = dom.createTextNode("Post URL");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("\n");
          dom.appendChild(el5, el6);
          var el6 = dom.createComment("");
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("\n                ");
          dom.appendChild(el5, el6);
          var el6 = dom.createElement("span");
          dom.setAttribute(el6,"class","input-icon icon-link");
          var el7 = dom.createTextNode("\n                    ");
          dom.appendChild(el6, el7);
          var el7 = dom.createComment("");
          dom.appendChild(el6, el7);
          var el7 = dom.createTextNode("\n                ");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("\n                ");
          dom.appendChild(el5, el6);
          var el6 = dom.createComment("");
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("\n            ");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n\n            ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("div");
          dom.setAttribute(el5,"class","form-group");
          var el6 = dom.createTextNode("\n                ");
          dom.appendChild(el5, el6);
          var el6 = dom.createElement("label");
          dom.setAttribute(el6,"for","post-setting-date");
          var el7 = dom.createTextNode("Publish Date");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("\n                ");
          dom.appendChild(el5, el6);
          var el6 = dom.createElement("span");
          dom.setAttribute(el6,"class","input-icon icon-calendar");
          var el7 = dom.createTextNode("\n                    ");
          dom.appendChild(el6, el7);
          var el7 = dom.createComment("");
          dom.appendChild(el6, el7);
          var el7 = dom.createTextNode("\n                ");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("\n            ");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n\n");
          dom.appendChild(el4, el5);
          var el5 = dom.createComment("");
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n            ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("ul");
          dom.setAttribute(el5,"class","nav-list nav-list-block");
          var el6 = dom.createTextNode("\n");
          dom.appendChild(el5, el6);
          var el6 = dom.createComment("");
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("            ");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n\n            ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("div");
          dom.setAttribute(el5,"class","form-group for-checkbox");
          var el6 = dom.createTextNode("\n                ");
          dom.appendChild(el5, el6);
          var el6 = dom.createElement("label");
          dom.setAttribute(el6,"class","checkbox");
          dom.setAttribute(el6,"for","static-page");
          var el7 = dom.createTextNode("\n                    ");
          dom.appendChild(el6, el7);
          var el7 = dom.createComment("");
          dom.appendChild(el6, el7);
          var el7 = dom.createTextNode("\n                    ");
          dom.appendChild(el6, el7);
          var el7 = dom.createElement("span");
          dom.setAttribute(el7,"class","input-toggle-component");
          dom.appendChild(el6, el7);
          var el7 = dom.createTextNode("\n                    ");
          dom.appendChild(el6, el7);
          var el7 = dom.createElement("p");
          var el8 = dom.createTextNode("Turn this post into a static page");
          dom.appendChild(el7, el8);
          dom.appendChild(el6, el7);
          var el7 = dom.createTextNode("\n                ");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("\n\n                ");
          dom.appendChild(el5, el6);
          var el6 = dom.createElement("label");
          dom.setAttribute(el6,"class","checkbox");
          dom.setAttribute(el6,"for","featured");
          var el7 = dom.createTextNode("\n                    ");
          dom.appendChild(el6, el7);
          var el7 = dom.createComment("");
          dom.appendChild(el6, el7);
          var el7 = dom.createTextNode("\n                    ");
          dom.appendChild(el6, el7);
          var el7 = dom.createElement("span");
          dom.setAttribute(el7,"class","input-toggle-component");
          dom.appendChild(el6, el7);
          var el7 = dom.createTextNode("\n                    ");
          dom.appendChild(el6, el7);
          var el7 = dom.createElement("p");
          var el8 = dom.createTextNode("Feature this post");
          dom.appendChild(el7, el8);
          dom.appendChild(el6, el7);
          var el7 = dom.createTextNode("\n                ");
          dom.appendChild(el6, el7);
          dom.appendChild(el5, el6);
          var el6 = dom.createTextNode("\n            ");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n\n            ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n        ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n    ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          var el3 = dom.createTextNode("\n");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("    ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, inline = hooks.inline, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element7 = dom.childAt(fragment, [0]);
          var element8 = dom.childAt(element7, [1]);
          var element9 = dom.childAt(element8, [1, 3]);
          var element10 = dom.childAt(element8, [3]);
          var element11 = dom.childAt(element10, [3]);
          var element12 = dom.childAt(element11, [1]);
          var element13 = dom.childAt(element11, [9]);
          var element14 = dom.childAt(element13, [1]);
          var element15 = dom.childAt(element13, [3]);
          var element16 = dom.childAt(element7, [3]);
          var attrMorph0 = dom.createAttrMorph(element8, 'class');
          var morph0 = dom.createMorphAt(element10,1,1);
          var morph1 = dom.createMorphAt(element12,3,3);
          var morph2 = dom.createMorphAt(dom.childAt(element12, [5]),1,1);
          var morph3 = dom.createMorphAt(element12,7,7);
          var morph4 = dom.createMorphAt(dom.childAt(element11, [3, 3]),1,1);
          var morph5 = dom.createMorphAt(element11,5,5);
          var morph6 = dom.createMorphAt(dom.childAt(element11, [7]),1,1);
          var morph7 = dom.createMorphAt(element14,1,1);
          var morph8 = dom.createMorphAt(element15,1,1);
          var morph9 = dom.createMorphAt(element16,1,1);
          var attrMorph1 = dom.createAttrMorph(element16, 'class');
          attribute(env, attrMorph0, element8, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "isViewingSubview"), "settings-menu-pane-out-left", "settings-menu-pane-in"], {}), " settings-menu settings-menu-pane"]));
          element(env, element9, context, "action", ["closeSettingsMenu"], {});
          inline(env, morph0, context, "gh-uploader", [], {"uploaded": "setCoverImage", "canceled": "clearCoverImage", "description": "Add post image", "image": get(env, context, "model.image"), "uploaderReference": get(env, context, "uploaderReference"), "tagName": "section"});
          block(env, morph1, context, "if", [get(env, context, "model.isPublished")], {}, child0, child1);
          inline(env, morph2, context, "gh-input", [], {"class": "post-setting-slug", "id": "url", "value": get(env, context, "slugValue"), "name": "post-setting-slug", "focus-out": "updateSlug", "selectOnClick": "true", "stopEnterKeyDownPropagation": "true"});
          inline(env, morph3, context, "gh-url-preview", [], {"slug": get(env, context, "slugValue"), "tagName": "p", "classNames": "description"});
          inline(env, morph4, context, "gh-input", [], {"class": "post-setting-date", "id": "post-setting-date", "value": get(env, context, "publishedAtValue"), "name": "post-setting-date", "focus-out": "setPublishedAt", "stopEnterKeyDownPropagation": "true"});
          block(env, morph5, context, "unless", [get(env, context, "session.user.isAuthor")], {}, child2, null);
          block(env, morph6, context, "gh-tab", [], {"tagName": "li", "classNames": "nav-list-item"}, child3, null);
          element(env, element14, context, "action", ["togglePage"], {"bubbles": "false"});
          inline(env, morph7, context, "input", [], {"type": "checkbox", "name": "static-page", "id": "static-page", "class": "post-setting-static-page", "checked": get(env, context, "model.page")});
          element(env, element15, context, "action", ["toggleFeatured"], {"bubbles": "false"});
          inline(env, morph8, context, "input", [], {"type": "checkbox", "name": "featured", "id": "featured", "class": "post-setting-featured", "checked": get(env, context, "model.featured")});
          attribute(env, attrMorph1, element16, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "isViewingSubview"), "settings-menu-pane-in", "settings-menu-pane-out-right"], {}), " settings-menu settings-menu-pane"]));
          block(env, morph9, context, "gh-tab-pane", [], {}, child4, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","content-cover");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, element = hooks.element, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element17 = dom.childAt(fragment, [0]);
        var morph0 = dom.createMorphAt(fragment,2,2,contextualElement);
        dom.insertBoundary(fragment, null);
        element(env, element17, context, "action", ["closeSettingsMenu"], {});
        block(env, morph0, context, "gh-tabs-manager", [], {"selected": "showSubview", "id": "entry-controls", "class": "settings-menu-container"}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/post-tags-input', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("           ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("span");
          dom.setAttribute(el1,"class","tag");
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, element = hooks.element, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(element0,0,0);
          element(env, element0, context, "action", ["deleteTag", get(env, context, "tag")], {"target": get(env, context, "view")});
          content(env, morph0, context, "tag.name");
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("a");
            dom.setAttribute(el1,"href","javascript:void(0);");
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]),0,0);
            content(env, morph0, context, "view.suggestion.highlightedName");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "view", [get(env, context, "view.suggestionView")], {"suggestion": get(env, context, "suggestion")}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","publish-bar-tags-icon");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("label");
        dom.setAttribute(el2,"class","tag-label icon-tag");
        dom.setAttribute(el2,"for","tags");
        dom.setAttribute(el2,"title","Tags");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","sr-only");
        var el4 = dom.createTextNode("Tags");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","publish-bar-tags");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","tags-wrapper tags");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","publish-bar-tags-input");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("input");
        dom.setAttribute(el2,"type","hidden");
        dom.setAttribute(el2,"class","tags-holder");
        dom.setAttribute(el2,"id","tags-holder");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("ul");
        dom.setAttribute(el2,"class","suggestions dropdown-menu dropdown-triangle-bottom");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block, inline = hooks.inline, attribute = hooks.attribute;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element1 = dom.childAt(fragment, [4]);
        var element2 = dom.childAt(element1, [5]);
        var morph0 = dom.createMorphAt(dom.childAt(fragment, [2, 1]),1,1);
        var morph1 = dom.createMorphAt(element1,3,3);
        var morph2 = dom.createMorphAt(element2,1,1);
        var attrMorph0 = dom.createAttrMorph(element2, 'style');
        block(env, morph0, context, "each", [get(env, context, "controller.tags")], {"keyword": "tag"}, child0, null);
        inline(env, morph1, context, "view", [get(env, context, "view.tagInputView")], {"class": "tag-input js-tag-input", "id": "tags", "value": get(env, context, "newTagText")});
        attribute(env, attrMorph0, element2, "style", get(env, context, "view.overlayStyles"));
        block(env, morph2, context, "each", [get(env, context, "suggestions")], {"keyword": "suggestion"}, child1, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/posts', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("span");
          dom.setAttribute(el1,"class","hidden");
          var el2 = dom.createTextNode("New Post");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          var child0 = (function() {
            var child0 = (function() {
              return {
                isHTMLBars: true,
                revision: "Ember@1.11.3",
                blockParams: 0,
                cachedFragment: null,
                hasRendered: false,
                build: function build(dom) {
                  var el0 = dom.createDocumentFragment();
                  var el1 = dom.createTextNode("                                    ");
                  dom.appendChild(el0, el1);
                  var el1 = dom.createElement("span");
                  dom.setAttribute(el1,"class","page");
                  var el2 = dom.createTextNode("Page");
                  dom.appendChild(el1, el2);
                  dom.appendChild(el0, el1);
                  var el1 = dom.createTextNode("\n");
                  dom.appendChild(el0, el1);
                  return el0;
                },
                render: function render(context, env, contextualElement) {
                  var dom = env.dom;
                  dom.detectNamespace(contextualElement);
                  var fragment;
                  if (env.useFragmentCache && dom.canClone) {
                    if (this.cachedFragment === null) {
                      fragment = this.build(dom);
                      if (this.hasRendered) {
                        this.cachedFragment = fragment;
                      } else {
                        this.hasRendered = true;
                      }
                    }
                    if (this.cachedFragment) {
                      fragment = dom.cloneNode(this.cachedFragment, true);
                    }
                  } else {
                    fragment = this.build(dom);
                  }
                  return fragment;
                }
              };
            }());
            var child1 = (function() {
              return {
                isHTMLBars: true,
                revision: "Ember@1.11.3",
                blockParams: 0,
                cachedFragment: null,
                hasRendered: false,
                build: function build(dom) {
                  var el0 = dom.createDocumentFragment();
                  var el1 = dom.createTextNode("                                    ");
                  dom.appendChild(el0, el1);
                  var el1 = dom.createElement("time");
                  dom.setAttribute(el1,"class","date published");
                  var el2 = dom.createTextNode("\n                                        Published ");
                  dom.appendChild(el1, el2);
                  var el2 = dom.createComment("");
                  dom.appendChild(el1, el2);
                  var el2 = dom.createTextNode("\n                                    ");
                  dom.appendChild(el1, el2);
                  dom.appendChild(el0, el1);
                  var el1 = dom.createTextNode("\n");
                  dom.appendChild(el0, el1);
                  return el0;
                },
                render: function render(context, env, contextualElement) {
                  var dom = env.dom;
                  var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, inline = hooks.inline;
                  dom.detectNamespace(contextualElement);
                  var fragment;
                  if (env.useFragmentCache && dom.canClone) {
                    if (this.cachedFragment === null) {
                      fragment = this.build(dom);
                      if (this.hasRendered) {
                        this.cachedFragment = fragment;
                      } else {
                        this.hasRendered = true;
                      }
                    }
                    if (this.cachedFragment) {
                      fragment = dom.cloneNode(this.cachedFragment, true);
                    }
                  } else {
                    fragment = this.build(dom);
                  }
                  var element0 = dom.childAt(fragment, [1]);
                  var morph0 = dom.createMorphAt(element0,1,1);
                  var attrMorph0 = dom.createAttrMorph(element0, 'datetime');
                  attribute(env, attrMorph0, element0, "datetime", concat(env, [get(env, context, "post.model.published_at")]));
                  inline(env, morph0, context, "gh-format-timeago", [get(env, context, "post.model.published_at")], {});
                  return fragment;
                }
              };
            }());
            return {
              isHTMLBars: true,
              revision: "Ember@1.11.3",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createComment("");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                var hooks = env.hooks, get = hooks.get, block = hooks.block;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
                dom.insertBoundary(fragment, null);
                dom.insertBoundary(fragment, 0);
                block(env, morph0, context, "if", [get(env, context, "post.model.page")], {}, child0, child1);
                return fragment;
              }
            };
          }());
          var child1 = (function() {
            return {
              isHTMLBars: true,
              revision: "Ember@1.11.3",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createTextNode("                                ");
                dom.appendChild(el0, el1);
                var el1 = dom.createElement("span");
                dom.setAttribute(el1,"class","draft");
                var el2 = dom.createTextNode("Draft");
                dom.appendChild(el1, el2);
                dom.appendChild(el0, el1);
                var el1 = dom.createTextNode("\n");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                return fragment;
              }
            };
          }());
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("                    ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("h3");
              dom.setAttribute(el1,"class","entry-title");
              var el2 = dom.createComment("");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n                    ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("section");
              dom.setAttribute(el1,"class","entry-meta");
              var el2 = dom.createTextNode("\n                        ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("span");
              dom.setAttribute(el2,"class","avatar");
              var el3 = dom.createTextNode("\n                            ");
              dom.appendChild(el2, el3);
              var el3 = dom.createElement("img");
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("\n                        ");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                        ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("span");
              dom.setAttribute(el2,"class","author");
              var el3 = dom.createComment("");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                        ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("span");
              dom.setAttribute(el2,"class","status");
              var el3 = dom.createTextNode("\n");
              dom.appendChild(el2, el3);
              var el3 = dom.createComment("");
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("                        ");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                    ");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content, get = hooks.get, attribute = hooks.attribute, concat = hooks.concat, block = hooks.block;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var element1 = dom.childAt(fragment, [3]);
              var element2 = dom.childAt(element1, [1]);
              var element3 = dom.childAt(element2, [1]);
              var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]),0,0);
              var attrMorph0 = dom.createAttrMorph(element2, 'style');
              var attrMorph1 = dom.createAttrMorph(element3, 'src');
              var attrMorph2 = dom.createAttrMorph(element3, 'title');
              var morph1 = dom.createMorphAt(dom.childAt(element1, [3]),0,0);
              var morph2 = dom.createMorphAt(dom.childAt(element1, [5]),1,1);
              content(env, morph0, context, "post.model.title");
              attribute(env, attrMorph0, element2, "style", get(env, context, "post.authorAvatarBackground"));
              attribute(env, attrMorph1, element3, "src", concat(env, [get(env, context, "post.authorAvatar")]));
              attribute(env, attrMorph2, element3, "title", concat(env, [get(env, context, "post.authorName")]));
              content(env, morph1, context, "post.authorName");
              block(env, morph2, context, "if", [get(env, context, "post.isPublished")], {}, child0, child1);
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            block(env, morph0, context, "link-to", ["posts.post", get(env, context, "post.model")], {"class": "permalink", "alternateActive": get(env, context, "view.active"), "title": "Edit this post"}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("ol");
          dom.setAttribute(el1,"class","posts-list");
          var el2 = dom.createTextNode("\n");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("        ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]),1,1);
          block(env, morph0, context, "each", [get(env, context, "controller")], {"itemController": "posts/post", "itemView": "post-item-view", "itemTagName": "li", "keyword": "post"}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","page-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("button");
        dom.setAttribute(el2,"class","menu-button js-menu-button");
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","sr-only");
        var el4 = dom.createTextNode("Menu");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("Content");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","page-content");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("header");
        dom.setAttribute(el3,"class","floatingheader");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("section");
        dom.setAttribute(el4,"class","content-filter");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("small");
        var el6 = dom.createTextNode("All Posts");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, element = hooks.element, get = hooks.get, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, block = hooks.block, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element4 = dom.childAt(fragment, [0, 1]);
        var element5 = dom.childAt(fragment, [2]);
        var element6 = dom.childAt(element5, [1]);
        var element7 = dom.childAt(element5, [3]);
        var attrMorph0 = dom.createAttrMorph(element6, 'class');
        var morph0 = dom.createMorphAt(dom.childAt(element6, [1]),3,3);
        var morph1 = dom.createMorphAt(element6,3,3);
        var morph2 = dom.createMorphAt(element7,1,1);
        var attrMorph1 = dom.createAttrMorph(element7, 'class');
        element(env, element4, context, "action", ["toggleGlobalMobileNav"], {});
        attribute(env, attrMorph0, element6, "class", concat(env, ["content-list js-content-list ", subexpr(env, context, "if", [get(env, context, "postListFocused"), "keyboard-focused"], {})]));
        block(env, morph0, context, "link-to", ["editor.new"], {"class": "btn btn-green", "title": "New Post"}, child0, null);
        block(env, morph1, context, "view", ["paginated-scroll-box"], {"tagName": "section", "classNames": "content-list-content js-content-scrollbox"}, child1, null);
        attribute(env, attrMorph1, element7, "class", concat(env, ["content-preview js-content-preview ", subexpr(env, context, "if", [get(env, context, "postContentFocused"), "keyboard-focused"], {})]));
        content(env, morph2, context, "outlet");
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/posts/index', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createElement("button");
            dom.setAttribute(el1,"type","button");
            dom.setAttribute(el1,"class","btn btn-green btn-lg");
            dom.setAttribute(el1,"title","New Post");
            var el2 = dom.createTextNode("Write a new Post");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","no-posts");
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("h3");
          var el3 = dom.createTextNode("You Haven't Written Any Posts Yet!");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [0]),3,3);
          block(env, morph0, context, "link-to", ["editor.new"], {}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "noPosts")], {}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/posts/post', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Back");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("a");
          var el2 = dom.createTextNode("Published");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element1 = dom.childAt(fragment, [1]);
          var attrMorph0 = dom.createAttrMorph(element1, 'title');
          var attrMorph1 = dom.createAttrMorph(element1, 'href');
          attribute(env, attrMorph0, element1, "title", concat(env, [get(env, context, "model.title")]));
          attribute(env, attrMorph1, element1, "href", concat(env, [get(env, context, "model.absoluteUrl")]));
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                Written\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child3 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          content(env, morph0, context, "model.author.name");
          return fragment;
        }
      };
    }());
    var child4 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          content(env, morph0, context, "model.author.email");
          return fragment;
        }
      };
    }());
    var child5 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode(" Edit");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child6 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","wrapper");
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("h1");
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),0,0);
          var morph1 = dom.createMorphAt(element0,3,3);
          content(env, morph0, context, "model.title");
          inline(env, morph1, context, "gh-format-html", [get(env, context, "model.html")], {});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","post-preview-header clearfix");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("Preview");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("button");
        dom.setAttribute(el2,"type","button");
        dom.setAttribute(el2,"title","Feature this post");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","sr-only");
        var el4 = dom.createTextNode("Star");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("small");
        dom.setAttribute(el2,"class","post-published-by");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","status");
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","normal");
        var el4 = dom.createTextNode("by");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","author");
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","post-controls");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, get = hooks.get, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element2 = dom.childAt(fragment, [0]);
        var element3 = dom.childAt(element2, [5]);
        var element4 = dom.childAt(element2, [7]);
        var morph0 = dom.createMorphAt(element2,1,1);
        var attrMorph0 = dom.createAttrMorph(element3, 'class');
        var morph1 = dom.createMorphAt(dom.childAt(element4, [1]),1,1);
        var morph2 = dom.createMorphAt(dom.childAt(element4, [5]),0,0);
        var morph3 = dom.createMorphAt(dom.childAt(element2, [9]),1,1);
        var morph4 = dom.createMorphAt(fragment,2,2,contextualElement);
        dom.insertBoundary(fragment, null);
        block(env, morph0, context, "link-to", ["posts"], {"tagName": "button", "class": "btn btn-default btn-back"}, child0, null);
        attribute(env, attrMorph0, element3, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "model.featured"), "featured", "unfeatured"], {})]));
        element(env, element3, context, "action", ["toggleFeatured"], {});
        block(env, morph1, context, "if", [get(env, context, "isPublished")], {}, child1, child2);
        block(env, morph2, context, "if", [get(env, context, "model.author.name")], {}, child3, child4);
        block(env, morph3, context, "link-to", ["editor.edit", get(env, context, "model")], {"class": "btn btn-default post-edit"}, child5, null);
        block(env, morph4, context, "view", ["content-preview-content-view"], {"tagName": "section"}, child6, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/reset', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","reset-box js-reset-box fade-in");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","reset");
        dom.setAttribute(el2,"class","reset-form");
        dom.setAttribute(el2,"method","post");
        dom.setAttribute(el2,"novalidate","novalidate");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","password-wrap");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","password-wrap");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"class","btn btn-blue");
        dom.setAttribute(el3,"type","submit");
        var el4 = dom.createTextNode("Reset Password");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, element = hooks.element, get = hooks.get, inline = hooks.inline, attribute = hooks.attribute;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1]);
        var element1 = dom.childAt(element0, [5]);
        var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),1,1);
        var morph1 = dom.createMorphAt(dom.childAt(element0, [3]),1,1);
        var attrMorph0 = dom.createAttrMorph(element1, 'disabled');
        element(env, element0, context, "action", ["submit"], {"on": "submit"});
        inline(env, morph0, context, "input", [], {"value": get(env, context, "newPassword"), "class": "password", "type": "password", "placeholder": "Password", "name": "newpassword", "autofocus": "autofocus"});
        inline(env, morph1, context, "input", [], {"value": get(env, context, "ne2Password"), "class": "password", "type": "password", "placeholder": "Confirm Password", "name": "ne2password"});
        attribute(env, attrMorph0, element1, "disabled", get(env, context, "submitting"));
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-activating-list-item", [], {"route": "settings.general", "title": "General", "classNames": "settings-nav-general icon-settings"});
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-activating-list-item", [], {"route": "settings.users", "title": "Users", "classNames": "settings-nav-users icon-users"});
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-activating-list-item", [], {"route": "settings.tags", "title": "Tags", "classNames": "settings-nav-tags icon-tag"});
          return fragment;
        }
      };
    }());
    var child3 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-activating-list-item", [], {"route": "settings.navigation", "title": "Navigation", "classNames": "settings-nav-navigation icon-compass"});
          return fragment;
        }
      };
    }());
    var child4 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-activating-list-item", [], {"route": "settings.code-injection", "title": "Code Injection", "classNames": "settings-nav-code icon-code"});
          return fragment;
        }
      };
    }());
    var child5 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-activating-list-item", [], {"route": "settings.pass-protect", "title": "Password Protection", "classNames": "settings-nav-pass icon-lock"});
          return fragment;
        }
      };
    }());
    var child6 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-activating-list-item", [], {"route": "settings.labs", "title": "Labs", "classNames": "settings-nav-labs icon-atom"});
          return fragment;
        }
      };
    }());
    var child7 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-activating-list-item", [], {"route": "settings.about", "title": "About", "classNames": "settings-nav-about icon-pacman"});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","page-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("button");
        dom.setAttribute(el2,"class","menu-button js-menu-button");
        var el3 = dom.createElement("span");
        dom.setAttribute(el3,"class","sr-only");
        var el4 = dom.createTextNode("Menu");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("Settings");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","page-content");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("nav");
        dom.setAttribute(el2,"class","settings-nav js-settings-menu");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("ul");
        var el4 = dom.createTextNode("\n\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, element = hooks.element, get = hooks.get, block = hooks.block, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1]);
        var element1 = dom.childAt(fragment, [2]);
        var element2 = dom.childAt(element1, [1, 1]);
        var morph0 = dom.createMorphAt(element2,1,1);
        var morph1 = dom.createMorphAt(element2,3,3);
        var morph2 = dom.createMorphAt(element2,5,5);
        var morph3 = dom.createMorphAt(element2,7,7);
        var morph4 = dom.createMorphAt(element2,9,9);
        var morph5 = dom.createMorphAt(element2,11,11);
        var morph6 = dom.createMorphAt(element2,13,13);
        var morph7 = dom.createMorphAt(element2,15,15);
        var morph8 = dom.createMorphAt(element1,3,3);
        element(env, element0, context, "action", ["toggleGlobalMobileNav"], {});
        block(env, morph0, context, "if", [get(env, context, "showGeneral")], {}, child0, null);
        block(env, morph1, context, "if", [get(env, context, "showUsers")], {}, child1, null);
        block(env, morph2, context, "if", [get(env, context, "showTags")], {}, child2, null);
        block(env, morph3, context, "if", [get(env, context, "showNavigation")], {}, child3, null);
        block(env, morph4, context, "if", [get(env, context, "showCodeInjection")], {}, child4, null);
        block(env, morph5, context, "if", [get(env, context, "showPassProtection")], {}, child5, null);
        block(env, morph6, context, "if", [get(env, context, "showLabs")], {}, child6, null);
        block(env, morph7, context, "if", [get(env, context, "showAbout")], {}, child7, null);
        content(env, morph8, context, "outlet");
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/about', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Back");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("p");
          var el2 = dom.createTextNode("A free, open, simple publishing platform");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          content(env, morph0, context, "model.mail");
          return fragment;
        }
      };
    }());
    var child3 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Native");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","settings-view-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("About");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","content settings-about");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","about-ghost-intro");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("h1");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("span");
        dom.setAttribute(el4,"class","ghost_logo");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("span");
        dom.setAttribute(el5,"class","hidden");
        var el6 = dom.createTextNode("Ghost");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("span");
        dom.setAttribute(el4,"class","version blue");
        var el5 = dom.createTextNode("v");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","about-environment-help clearfix");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","about-environment");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("dl");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        var el7 = dom.createTextNode("Version:");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","about-environment-detail");
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        var el7 = dom.createTextNode("Environment:");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","about-environment-detail");
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        var el7 = dom.createTextNode("Database:");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","about-environment-detail about-environment-database");
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        var el7 = dom.createTextNode("Mail:");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","about-environment-detail");
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","about-help");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("a");
        dom.setAttribute(el5,"href","http://support.ghost.org");
        dom.setAttribute(el5,"class","btn");
        var el6 = dom.createTextNode("User Documentation");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("a");
        dom.setAttribute(el5,"href","https://ghost.org/slack/");
        dom.setAttribute(el5,"class","btn");
        var el6 = dom.createTextNode("Get Help With Ghost");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","about-credits");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("h1");
        var el4 = dom.createTextNode("The People Who Made it Possible");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("ul");
        dom.setAttribute(el3,"class","top-contributors clearfix");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("p");
        dom.setAttribute(el3,"class","about-contributors-info");
        var el4 = dom.createTextNode("Ghost is built by an incredible group of contributors from all over the world. Here are just a few of the people who helped create the version you’re using right now.");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("a");
        dom.setAttribute(el3,"href","https://ghost.org/about/contribute/");
        dom.setAttribute(el3,"class","about-get-involved btn-blue btn-lg btn");
        var el4 = dom.createTextNode("Find out how you can get involved");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("p");
        dom.setAttribute(el3,"class","about-copyright");
        var el4 = dom.createTextNode("\n            Copyright 2013 - 2015 Ghost Foundation, released under the ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4,"href","https://github.com/TryGhost/Ghost/blob/master/LICENSE");
        var el5 = dom.createTextNode("MIT license");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode(".\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("br");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4,"href","https://ghost.org/");
        var el5 = dom.createTextNode("Ghost");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode(" is a trademark of the ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4,"href","https://ghost.org/about/");
        var el5 = dom.createTextNode("Ghost Foundation");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode(".\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, content = hooks.content, inline = hooks.inline, get = hooks.get;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [2]);
        var element1 = dom.childAt(element0, [1]);
        var element2 = dom.childAt(element1, [7, 1, 1]);
        var morph0 = dom.createMorphAt(dom.childAt(fragment, [0]),1,1);
        var morph1 = dom.createMorphAt(dom.childAt(element1, [1, 3]),1,1);
        var morph2 = dom.createMorphAt(element1,3,3);
        var morph3 = dom.createMorphAt(element1,5,5);
        var morph4 = dom.createMorphAt(dom.childAt(element2, [3]),0,0);
        var morph5 = dom.createMorphAt(dom.childAt(element2, [7]),0,0);
        var morph6 = dom.createMorphAt(dom.childAt(element2, [11]),0,0);
        var morph7 = dom.createMorphAt(dom.childAt(element2, [15]),0,0);
        var morph8 = dom.createMorphAt(dom.childAt(element0, [3, 3]),1,1);
        block(env, morph0, context, "link-to", ["settings"], {"class": "btn btn-default btn-back"}, child0, null);
        content(env, morph1, context, "model.version");
        inline(env, morph2, context, "gh-notifications", [], {"location": "settings-about-upgrade", "notify": "updateNotificationChange"});
        block(env, morph3, context, "unless", [get(env, context, "updateNotificationCount")], {}, child1, null);
        content(env, morph4, context, "model.version");
        content(env, morph5, context, "model.environment");
        content(env, morph6, context, "model.database");
        block(env, morph7, context, "if", [get(env, context, "model.mail")], {}, child2, child3);
        inline(env, morph8, context, "partial", ["contributors"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/apps', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Back");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode(" - ");
            dom.appendChild(el0, el1);
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            var morph1 = dom.createMorphAt(fragment,2,2,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            content(env, morph0, context, "appController.model.package.name");
            content(env, morph1, context, "appController.model.package.version");
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode(" - package.json missing :(");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, 0);
            content(env, morph0, context, "appController.model.name");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("tr");
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("td");
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("td");
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("button");
          dom.setAttribute(el3,"type","button");
          var el4 = dom.createTextNode("\n                    ");
          dom.appendChild(el3, el4);
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n                ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var element1 = dom.childAt(element0, [3, 1]);
          var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),1,1);
          var morph1 = dom.createMorphAt(element1,1,1);
          var attrMorph0 = dom.createAttrMorph(element1, 'class');
          block(env, morph0, context, "if", [get(env, context, "appController.model.package")], {}, child0, child1);
          attribute(env, attrMorph0, element1, "class", concat(env, ["btn js-button-active ", subexpr(env, context, "if", [get(env, context, "activeClass"), "btn-red js-button-deactivate"], {}), " ", subexpr(env, context, "if", [get(env, context, "inactiveClass"), "btn-green"], {})]));
          element(env, element1, context, "action", [get(env, context, "toggleApp"), get(env, context, "appController")], {});
          content(env, morph1, context, "appController.buttonText");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","settings-view-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","title");
        var el3 = dom.createTextNode("Apps");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","content settings-apps");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("table");
        dom.setAttribute(el2,"class","js-apps");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("thead");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("th");
        var el5 = dom.createTextNode("App name");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("th");
        var el5 = dom.createTextNode("Status");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("tbody");
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, get = hooks.get;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(dom.childAt(fragment, [0]),1,1);
        var morph1 = dom.createMorphAt(dom.childAt(fragment, [2, 1, 3]),1,1);
        block(env, morph0, context, "link-to", ["settings"], {"class": "btn btn-default btn-back"}, child0, null);
        block(env, morph1, context, "each", [get(env, context, "model")], {"itemController": "settings/app", "keyword": "appController"}, child1, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/code-injection', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Back");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","settings-view-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("Code Injection");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","page-actions");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"type","button");
        dom.setAttribute(el3,"class","btn btn-blue");
        var el4 = dom.createTextNode("Save");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","content settings-code");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","settings-code");
        dom.setAttribute(el2,"novalidate","novalidate");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("\n                Ghost allows you to inject code into the top and bottom of your theme files without editing them. This allows for quick modifications to insert useful things like tracking codes and meta tags.\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","ghost-head");
        var el6 = dom.createTextNode("Blog Header");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Code here will be injected into the ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("code");
        var el7 = dom.createTextNode("{{ghost_head}}");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode(" tag on every page of your blog");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","ghost-foot");
        var el6 = dom.createTextNode("Blog Footer");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Code here will be injected into the ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("code");
        var el7 = dom.createTextNode("{{ghost_foot}}");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode(" tag on every page of your blog");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, element = hooks.element, get = hooks.get, inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(element0, [5, 1]);
        var element2 = dom.childAt(fragment, [2, 1, 1]);
        var morph0 = dom.createMorphAt(element0,1,1);
        var morph1 = dom.createMorphAt(dom.childAt(element2, [3]),5,5);
        var morph2 = dom.createMorphAt(dom.childAt(element2, [5]),5,5);
        block(env, morph0, context, "link-to", ["settings"], {"class": "btn btn-default btn-back"}, child0, null);
        element(env, element1, context, "action", ["save"], {});
        inline(env, morph1, context, "gh-cm-editor", [], {"id": "ghost-head", "name": "codeInjection[ghost_head]", "class": "settings-code-editor", "type": "text", "value": get(env, context, "model.ghost_head")});
        inline(env, morph2, context, "gh-cm-editor", [], {"id": "ghost-foot", "name": "codeInjection[ghost_foot]", "class": "settings-code-editor", "type": "text", "value": get(env, context, "model.ghost_foot")});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/general', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Back");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("img");
          dom.setAttribute(el1,"class","blog-logo");
          dom.setAttribute(el1,"alt","logo");
          dom.setAttribute(el1,"role","button");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element3 = dom.childAt(fragment, [1]);
          var attrMorph0 = dom.createAttrMorph(element3, 'src');
          attribute(env, attrMorph0, element3, "src", concat(env, [get(env, context, "model.logo")]));
          element(env, element3, context, "action", ["openModal", "upload", get(env, context, "this"), "logo"], {});
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("button");
          dom.setAttribute(el1,"type","button");
          dom.setAttribute(el1,"class","btn btn-green js-modal-logo");
          var el2 = dom.createTextNode("Upload Image");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element2 = dom.childAt(fragment, [1]);
          element(env, element2, context, "action", ["openModal", "upload", get(env, context, "this"), "logo"], {});
          return fragment;
        }
      };
    }());
    var child3 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("img");
          dom.setAttribute(el1,"class","blog-cover");
          dom.setAttribute(el1,"alt","cover photo");
          dom.setAttribute(el1,"role","button");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element1 = dom.childAt(fragment, [1]);
          var attrMorph0 = dom.createAttrMorph(element1, 'src');
          attribute(env, attrMorph0, element1, "src", concat(env, [get(env, context, "model.cover")]));
          element(env, element1, context, "action", ["openModal", "upload", get(env, context, "this"), "cover"], {});
          return fragment;
        }
      };
    }());
    var child4 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("button");
          dom.setAttribute(el1,"type","button");
          dom.setAttribute(el1,"class","btn btn-green js-modal-cover");
          var el2 = dom.createTextNode("Upload Image");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          element(env, element0, context, "action", ["openModal", "upload", get(env, context, "this"), "cover"], {});
          return fragment;
        }
      };
    }());
    var child5 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","form-group");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("p");
          var el3 = dom.createTextNode("This password will be needed to access your blog. All search engine optimization and social features are now disabled. This password is stored in plaintext.");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]),1,1);
          inline(env, morph0, context, "input", [], {"name": "general[password]", "type": "text", "value": get(env, context, "model.password")});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","settings-view-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("General");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","page-actions");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"type","button");
        dom.setAttribute(el3,"class","btn btn-blue");
        var el4 = dom.createTextNode("Save");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","content settings-general");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","settings-general");
        dom.setAttribute(el2,"novalidate","novalidate");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","blog-title");
        var el6 = dom.createTextNode("Blog Title");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("The name of your blog");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group description-container");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","blog-description");
        var el6 = dom.createTextNode("Blog Description");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("\n                    Describe what your blog is about\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","form-group");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("label");
        var el5 = dom.createTextNode("Blog Logo");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("Display a sexy logo for your publication");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","form-group");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("label");
        var el5 = dom.createTextNode("Blog Cover");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("Display a cover image on your site");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","email-address");
        var el6 = dom.createTextNode("Email Address");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Address to use for admin notifications");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","postsPerPage");
        var el6 = dom.createTextNode("Posts per page");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("How many posts should be displayed on each page");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group for-checkbox");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","permalinks");
        var el6 = dom.createTextNode("Dated Permalinks");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"class","checkbox");
        dom.setAttribute(el5,"for","permalinks");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("span");
        dom.setAttribute(el6,"class","input-toggle-component");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("p");
        var el7 = dom.createTextNode("Include the date in your post URLs");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group for-select");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","activeTheme");
        var el6 = dom.createTextNode("Theme");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("span");
        dom.setAttribute(el5,"class","gh-select");
        dom.setAttribute(el5,"tabindex","0");
        var el6 = dom.createTextNode("\n                   ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n               ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Select a theme for your blog");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group for-checkbox");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","isPrivate");
        var el6 = dom.createTextNode("Make this blog private");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"class","checkbox");
        dom.setAttribute(el5,"for","isPrivate");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("span");
        dom.setAttribute(el6,"class","input-toggle-component");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("p");
        var el7 = dom.createTextNode("Enable password protection");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, element = hooks.element, get = hooks.get, inline = hooks.inline, concat = hooks.concat, attribute = hooks.attribute;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element4 = dom.childAt(fragment, [0]);
        var element5 = dom.childAt(element4, [5, 1]);
        var element6 = dom.childAt(fragment, [2, 1]);
        var element7 = dom.childAt(element6, [1]);
        var element8 = dom.childAt(element7, [3]);
        var element9 = dom.childAt(element6, [7]);
        var element10 = dom.childAt(element9, [7, 3]);
        var morph0 = dom.createMorphAt(element4,1,1);
        var morph1 = dom.createMorphAt(dom.childAt(element7, [1]),3,3);
        var morph2 = dom.createMorphAt(element8,3,3);
        var morph3 = dom.createMorphAt(dom.childAt(element8, [5]),1,1);
        var morph4 = dom.createMorphAt(dom.childAt(element6, [3]),3,3);
        var morph5 = dom.createMorphAt(dom.childAt(element6, [5]),3,3);
        var morph6 = dom.createMorphAt(dom.childAt(element9, [1]),3,3);
        var morph7 = dom.createMorphAt(dom.childAt(element9, [3]),3,3);
        var morph8 = dom.createMorphAt(dom.childAt(element9, [5, 3]),1,1);
        var morph9 = dom.createMorphAt(element10,1,1);
        var attrMorph0 = dom.createAttrMorph(element10, 'data-select-text');
        var morph10 = dom.createMorphAt(dom.childAt(element9, [9, 3]),1,1);
        var morph11 = dom.createMorphAt(element9,11,11);
        block(env, morph0, context, "link-to", ["settings"], {"class": "btn btn-default btn-back"}, child0, null);
        element(env, element5, context, "action", ["save"], {});
        inline(env, morph1, context, "input", [], {"id": "blog-title", "name": "general[title]", "type": "text", "value": get(env, context, "model.title")});
        inline(env, morph2, context, "textarea", [], {"id": "blog-description", "name": "general[description]", "value": get(env, context, "model.description")});
        inline(env, morph3, context, "gh-count-characters", [get(env, context, "model.description")], {});
        block(env, morph4, context, "if", [get(env, context, "model.logo")], {}, child1, child2);
        block(env, morph5, context, "if", [get(env, context, "model.cover")], {}, child3, child4);
        inline(env, morph6, context, "input", [], {"id": "email-address", "name": "general[email-address]", "type": "email", "value": get(env, context, "model.email"), "autocapitalize": "off", "autocorrect": "off"});
        inline(env, morph7, context, "input", [], {"id": "postsPerPage", "name": "general[postsPerPage]", "focus-out": "checkPostsPerPage", "value": get(env, context, "model.postsPerPage"), "min": "1", "max": "1000", "type": "number", "pattern": "[0-9]*"});
        inline(env, morph8, context, "input", [], {"id": "permalinks", "name": "general[permalinks]", "type": "checkbox", "checked": get(env, context, "isDatedPermalinks")});
        attribute(env, attrMorph0, element10, "data-select-text", concat(env, [get(env, context, "selectedTheme.label")]));
        inline(env, morph9, context, "view", ["select"], {"id": "activeTheme", "name": "general[activeTheme]", "content": get(env, context, "themes"), "optionValuePath": "content.name", "optionLabelPath": "content.label", "value": get(env, context, "model.activeTheme"), "selection": get(env, context, "selectedTheme")});
        inline(env, morph10, context, "input", [], {"id": "isPrivate", "name": "general[isPrivate]", "type": "checkbox", "checked": get(env, context, "model.isPrivate")});
        block(env, morph11, context, "if", [get(env, context, "model.isPrivate")], {}, child5, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/labs', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Back");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("fieldset");
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","form-group");
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("label");
          var el4 = dom.createTextNode("Import");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("p");
          var el4 = dom.createTextNode("Import from another Ghost installation. If you import a user, this will replace the current user & log you out.");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, inline = hooks.inline, get = hooks.get;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1, 1]);
          var morph0 = dom.createMorphAt(element0,3,3);
          var morph1 = dom.createMorphAt(element0,5,5);
          inline(env, morph0, context, "partial", ["import-errors"], {});
          inline(env, morph1, context, "gh-file-upload", [], {"id": "importfile", "uploadButtonText": get(env, context, "uploadButtonText")});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","settings-view-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("Labs");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","content settings-debug");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createElement("strong");
        var el4 = dom.createTextNode("Important note:");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode(" Labs is a testing ground for experimental features which aren't quite ready for primetime. They may change, break or inexplicably disappear at any time.");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","settings-export");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        var el6 = dom.createTextNode("Export");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","button");
        dom.setAttribute(el5,"class","btn btn-blue");
        var el6 = dom.createTextNode("Export");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Export the blog settings and data.");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","settings-resetdb");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        var el6 = dom.createTextNode("Delete all Content");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","button");
        dom.setAttribute(el5,"class","btn btn-red js-delete");
        var el6 = dom.createTextNode("Delete");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Delete all posts and tags from the database.");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","settings-testmail");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        var el6 = dom.createTextNode("Send a test email");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","button");
        dom.setAttribute(el5,"id","sendtestmail");
        dom.setAttribute(el5,"class","btn btn-blue");
        var el6 = dom.createTextNode("Send");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Sends a test email to your address.");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element1 = dom.childAt(fragment, [2]);
        var element2 = dom.childAt(element1, [3, 1, 1, 3]);
        var element3 = dom.childAt(element1, [7, 1, 1, 3]);
        var element4 = dom.childAt(element1, [9, 1, 1, 3]);
        var morph0 = dom.createMorphAt(dom.childAt(fragment, [0]),1,1);
        var morph1 = dom.createMorphAt(element1,5,5);
        block(env, morph0, context, "link-to", ["settings"], {"class": "btn btn-default btn-back"}, child0, null);
        element(env, element2, context, "action", ["exportData"], {});
        block(env, morph1, context, "gh-form", [], {"id": "settings-import", "enctype": "multipart/form-data"}, child1, null);
        element(env, element3, context, "action", ["openModal", "deleteAll"], {});
        element(env, element4, context, "action", ["sendTestEmail"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/navigation', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Back");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          inline(env, morph0, context, "gh-navitem", [], {"navItem": get(env, context, "navItem"), "baseUrl": get(env, context, "blogUrl"), "addItem": "addItem", "deleteItem": "deleteItem", "updateUrl": "updateUrl"});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","settings-view-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("Navigation");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","page-actions");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"type","button");
        dom.setAttribute(el3,"class","btn btn-blue");
        var el4 = dom.createTextNode("Save");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","content settings-navigation");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","settings-navigation");
        dom.setAttribute(el2,"class","js-settings-navigation");
        dom.setAttribute(el2,"novalidate","novalidate");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, element = hooks.element, get = hooks.get;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(element0, [5, 1]);
        var morph0 = dom.createMorphAt(element0,1,1);
        var morph1 = dom.createMorphAt(dom.childAt(fragment, [2, 1]),1,1);
        block(env, morph0, context, "link-to", ["settings"], {"class": "btn btn-default btn-back"}, child0, null);
        element(env, element1, context, "action", ["save"], {});
        block(env, morph1, context, "each", [get(env, context, "navigationItems")], {"keyword": "navItem"}, child1, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/tags', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("Back");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","settings-tag");
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("button");
          dom.setAttribute(el2,"class","tag-edit-button");
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("span");
          dom.setAttribute(el3,"class","tag-title");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("span");
          dom.setAttribute(el3,"class","label label-default");
          var el4 = dom.createTextNode("/");
          dom.appendChild(el3, el4);
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("p");
          dom.setAttribute(el3,"class","tag-description");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n                ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("span");
          dom.setAttribute(el3,"class","tags-count");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, element = hooks.element, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1, 1]);
          var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),0,0);
          var morph1 = dom.createMorphAt(dom.childAt(element0, [3]),1,1);
          var morph2 = dom.createMorphAt(dom.childAt(element0, [5]),0,0);
          var morph3 = dom.createMorphAt(dom.childAt(element0, [7]),0,0);
          element(env, element0, context, "action", ["editTag", get(env, context, "tag")], {});
          content(env, morph0, context, "tag.name");
          content(env, morph1, context, "tag.slug");
          content(env, morph2, context, "tag.description");
          content(env, morph3, context, "tag.post_count");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","settings-view-header");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createTextNode("Tags");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","page-actions");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"type","button");
        dom.setAttribute(el3,"class","btn btn-green");
        var el4 = dom.createTextNode("New Tag");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","content settings-tags");
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, element = hooks.element, get = hooks.get;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element1 = dom.childAt(fragment, [0]);
        var element2 = dom.childAt(element1, [5, 1]);
        var morph0 = dom.createMorphAt(element1,1,1);
        var morph1 = dom.createMorphAt(dom.childAt(fragment, [2]),1,1);
        block(env, morph0, context, "link-to", ["settings"], {"class": "btn btn-default btn-back"}, child0, null);
        element(env, element2, context, "action", ["newTag"], {});
        block(env, morph1, context, "each", [get(env, context, "tags")], {"keyword": "tag"}, child1, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/tags/settings-menu', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                        ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("button");
            dom.setAttribute(el1,"type","button");
            var el2 = dom.createTextNode("\n                            ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("b");
            var el3 = dom.createTextNode("Meta Data");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                            ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("span");
            var el3 = dom.createTextNode("Extra content for SEO and social media.");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                        ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                    ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("button");
            dom.setAttribute(el1,"type","button");
            dom.setAttribute(el1,"class","btn btn-link btn-sm tag-delete-button icon-trash");
            var el2 = dom.createTextNode("Delete Tag");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, element = hooks.element;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element5 = dom.childAt(fragment, [1]);
            element(env, element5, context, "action", ["openModal", "delete-tag", get(env, context, "activeTag")], {});
            return fragment;
          }
        };
      }());
      var child2 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("            ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("div");
            dom.setAttribute(el1,"class","settings-menu-header subview");
            var el2 = dom.createTextNode("\n                ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("button");
            dom.setAttribute(el2,"class","back icon-chevron-left settings-menu-header-action");
            var el3 = dom.createElement("span");
            dom.setAttribute(el3,"class","hidden");
            var el4 = dom.createTextNode("Back");
            dom.appendChild(el3, el4);
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n                ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("h4");
            var el3 = dom.createTextNode("Meta Data");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n            ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n\n            ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("div");
            dom.setAttribute(el1,"class","settings-menu-content");
            var el2 = dom.createTextNode("\n                ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("form");
            var el3 = dom.createTextNode("\n                ");
            dom.appendChild(el2, el3);
            var el3 = dom.createElement("div");
            dom.setAttribute(el3,"class","form-group");
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createElement("label");
            dom.setAttribute(el4,"for","meta-title");
            var el5 = dom.createTextNode("Meta Title");
            dom.appendChild(el4, el5);
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createComment("");
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createElement("p");
            var el5 = dom.createTextNode("Recommended: ");
            dom.appendChild(el4, el5);
            var el5 = dom.createElement("b");
            var el6 = dom.createTextNode("70");
            dom.appendChild(el5, el6);
            dom.appendChild(el4, el5);
            var el5 = dom.createTextNode(" characters. You’ve used ");
            dom.appendChild(el4, el5);
            var el5 = dom.createComment("");
            dom.appendChild(el4, el5);
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                ");
            dom.appendChild(el3, el4);
            dom.appendChild(el2, el3);
            var el3 = dom.createTextNode("\n\n                ");
            dom.appendChild(el2, el3);
            var el3 = dom.createElement("div");
            dom.setAttribute(el3,"class","form-group");
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createElement("label");
            dom.setAttribute(el4,"for","meta-description");
            var el5 = dom.createTextNode("Meta Description");
            dom.appendChild(el4, el5);
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createComment("");
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createElement("p");
            var el5 = dom.createTextNode("Recommended: ");
            dom.appendChild(el4, el5);
            var el5 = dom.createElement("b");
            var el6 = dom.createTextNode("156");
            dom.appendChild(el5, el6);
            dom.appendChild(el4, el5);
            var el5 = dom.createTextNode(" characters. You’ve used ");
            dom.appendChild(el4, el5);
            var el5 = dom.createComment("");
            dom.appendChild(el4, el5);
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                ");
            dom.appendChild(el3, el4);
            dom.appendChild(el2, el3);
            var el3 = dom.createTextNode("\n\n                ");
            dom.appendChild(el2, el3);
            var el3 = dom.createElement("div");
            dom.setAttribute(el3,"class","form-group");
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createElement("label");
            var el5 = dom.createTextNode("Search Engine Result Preview");
            dom.appendChild(el4, el5);
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                    ");
            dom.appendChild(el3, el4);
            var el4 = dom.createElement("div");
            dom.setAttribute(el4,"class","seo-preview");
            var el5 = dom.createTextNode("\n                        ");
            dom.appendChild(el4, el5);
            var el5 = dom.createElement("div");
            dom.setAttribute(el5,"class","seo-preview-title");
            var el6 = dom.createComment("");
            dom.appendChild(el5, el6);
            dom.appendChild(el4, el5);
            var el5 = dom.createTextNode("\n                        ");
            dom.appendChild(el4, el5);
            var el5 = dom.createElement("div");
            dom.setAttribute(el5,"class","seo-preview-link");
            var el6 = dom.createComment("");
            dom.appendChild(el5, el6);
            dom.appendChild(el4, el5);
            var el5 = dom.createTextNode("\n                        ");
            dom.appendChild(el4, el5);
            var el5 = dom.createElement("div");
            dom.setAttribute(el5,"class","seo-preview-description");
            var el6 = dom.createComment("");
            dom.appendChild(el5, el6);
            dom.appendChild(el4, el5);
            var el5 = dom.createTextNode("\n                    ");
            dom.appendChild(el4, el5);
            dom.appendChild(el3, el4);
            var el4 = dom.createTextNode("\n                ");
            dom.appendChild(el3, el4);
            dom.appendChild(el2, el3);
            var el3 = dom.createTextNode("\n                ");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n            ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, element = hooks.element, get = hooks.get, inline = hooks.inline, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element0 = dom.childAt(fragment, [1, 1]);
            var element1 = dom.childAt(fragment, [3, 1]);
            var element2 = dom.childAt(element1, [1]);
            var element3 = dom.childAt(element1, [3]);
            var element4 = dom.childAt(element1, [5, 3]);
            var morph0 = dom.createMorphAt(element2,3,3);
            var morph1 = dom.createMorphAt(dom.childAt(element2, [5]),3,3);
            var morph2 = dom.createMorphAt(element3,3,3);
            var morph3 = dom.createMorphAt(dom.childAt(element3, [5]),3,3);
            var morph4 = dom.createMorphAt(dom.childAt(element4, [1]),0,0);
            var morph5 = dom.createMorphAt(dom.childAt(element4, [3]),0,0);
            var morph6 = dom.createMorphAt(dom.childAt(element4, [5]),0,0);
            element(env, element0, context, "action", ["closeSubview"], {});
            inline(env, morph0, context, "gh-input", [], {"type": "text", "value": get(env, context, "activeTagMetaTitleScratch"), "focus-out": "saveActiveTagMetaTitle"});
            inline(env, morph1, context, "gh-count-down-characters", [get(env, context, "activeTagMetaTitleScratch"), 70], {});
            inline(env, morph2, context, "gh-textarea", [], {"value": get(env, context, "activeTagMetaDescriptionScratch"), "focus-out": "saveActiveTagMetaDescription"});
            inline(env, morph3, context, "gh-count-down-characters", [get(env, context, "activeTagMetaDescriptionScratch"), 156], {});
            content(env, morph4, context, "seoTitle");
            content(env, morph5, context, "seoURL");
            content(env, morph6, context, "seoDescription");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","settings-menu-header");
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("h4");
          var el4 = dom.createTextNode("Tag Settings");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("button");
          dom.setAttribute(el3,"class","close icon-x settings-menu-header-action");
          var el4 = dom.createTextNode("\n                ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("span");
          dom.setAttribute(el4,"class","hidden");
          var el5 = dom.createTextNode("Close");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n            ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","settings-menu-content");
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("form");
          var el4 = dom.createTextNode("\n                ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("div");
          dom.setAttribute(el4,"class","form-group");
          var el5 = dom.createTextNode("\n                    ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("label");
          var el6 = dom.createTextNode("Name");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                    ");
          dom.appendChild(el4, el5);
          var el5 = dom.createComment("");
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n\n                ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("div");
          dom.setAttribute(el4,"class","form-group");
          var el5 = dom.createTextNode("\n                    ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("label");
          var el6 = dom.createTextNode("URL");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                    ");
          dom.appendChild(el4, el5);
          var el5 = dom.createComment("");
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                    ");
          dom.appendChild(el4, el5);
          var el5 = dom.createComment("");
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n\n                ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("div");
          dom.setAttribute(el4,"class","form-group");
          var el5 = dom.createTextNode("\n                    ");
          dom.appendChild(el4, el5);
          var el5 = dom.createElement("label");
          var el6 = dom.createTextNode("Description");
          dom.appendChild(el5, el6);
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                    ");
          dom.appendChild(el4, el5);
          var el5 = dom.createComment("");
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("\n                ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n\n                ");
          dom.appendChild(el3, el4);
          var el4 = dom.createElement("ul");
          dom.setAttribute(el4,"class","nav-list nav-list-block");
          var el5 = dom.createTextNode("\n");
          dom.appendChild(el4, el5);
          var el5 = dom.createComment("");
          dom.appendChild(el4, el5);
          var el5 = dom.createTextNode("                ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n\n");
          dom.appendChild(el3, el4);
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("            ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          var el2 = dom.createTextNode("\n");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, subexpr = hooks.subexpr, concat = hooks.concat, attribute = hooks.attribute, element = hooks.element, inline = hooks.inline, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element6 = dom.childAt(fragment, [1]);
          var element7 = dom.childAt(element6, [1, 3]);
          var element8 = dom.childAt(element6, [3]);
          var element9 = dom.childAt(element8, [3]);
          var element10 = dom.childAt(element9, [3]);
          var element11 = dom.childAt(fragment, [3]);
          var attrMorph0 = dom.createAttrMorph(element6, 'class');
          var morph0 = dom.createMorphAt(element8,1,1);
          var morph1 = dom.createMorphAt(dom.childAt(element9, [1]),3,3);
          var morph2 = dom.createMorphAt(element10,3,3);
          var morph3 = dom.createMorphAt(element10,5,5);
          var morph4 = dom.createMorphAt(dom.childAt(element9, [5]),3,3);
          var morph5 = dom.createMorphAt(dom.childAt(element9, [7]),1,1);
          var morph6 = dom.createMorphAt(element9,9,9);
          var morph7 = dom.createMorphAt(element11,1,1);
          var attrMorph1 = dom.createAttrMorph(element11, 'class');
          attribute(env, attrMorph0, element6, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "isViewingSubview"), "settings-menu-pane-out-left", "settings-menu-pane-in"], {}), " settings-menu settings-menu-pane"]));
          element(env, element7, context, "action", ["closeSettingsMenu"], {});
          inline(env, morph0, context, "gh-uploader", [], {"uploaded": "setCoverImage", "canceled": "clearCoverImage", "description": "Add tag image", "image": get(env, context, "activeTag.image"), "uploaderReference": get(env, context, "uploaderReference"), "tagName": "section"});
          inline(env, morph1, context, "gh-input", [], {"type": "text", "value": get(env, context, "activeTagNameScratch"), "focus-out": "saveActiveTagName"});
          inline(env, morph2, context, "gh-input", [], {"type": "text", "value": get(env, context, "activeTagSlugScratch"), "focus-out": "saveActiveTagSlug"});
          inline(env, morph3, context, "gh-url-preview", [], {"prefix": "tag", "slug": get(env, context, "activeTagSlugScratch"), "tagName": "p", "classNames": "description"});
          inline(env, morph4, context, "gh-textarea", [], {"value": get(env, context, "activeTagDescriptionScratch"), "focus-out": "saveActiveTagDescription"});
          block(env, morph5, context, "gh-tab", [], {"tagName": "li", "classNames": "nav-list-item"}, child0, null);
          block(env, morph6, context, "unless", [get(env, context, "activeTag.isNew")], {}, child1, null);
          attribute(env, attrMorph1, element11, "class", concat(env, [subexpr(env, context, "if", [get(env, context, "isViewingSubview"), "settings-menu-pane-in", "settings-menu-pane-out-right"], {}), " settings-menu settings-menu-pane"]));
          block(env, morph7, context, "gh-tab-pane", [], {}, child2, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","content-cover");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, element = hooks.element, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element12 = dom.childAt(fragment, [0]);
        var morph0 = dom.createMorphAt(fragment,2,2,contextualElement);
        dom.insertBoundary(fragment, null);
        element(env, element12, context, "action", ["closeSettingsMenu"], {});
        block(env, morph0, context, "gh-tabs-manager", [], {"selected": "showSubview", "class": "settings-menu-container"}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/users', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, 0);
        content(env, morph0, context, "outlet");
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/users/index', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("Back");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("            ");
            dom.appendChild(el0, el1);
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
            block(env, morph0, context, "link-to", ["content"], {"class": "btn btn-default btn-back"}, child0, null);
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("Back");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("            ");
            dom.appendChild(el0, el1);
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
            block(env, morph0, context, "link-to", ["settings"], {"class": "btn btn-default btn-back"}, child0, null);
            return fragment;
          }
        };
      }());
      var child2 = (function() {
        var child0 = (function() {
          var child0 = (function() {
            return {
              isHTMLBars: true,
              revision: "Ember@1.11.3",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createTextNode("                                ");
                dom.appendChild(el0, el1);
                var el1 = dom.createElement("span");
                dom.setAttribute(el1,"class","red");
                var el2 = dom.createTextNode("Invitation not sent - please try again");
                dom.appendChild(el1, el2);
                dom.appendChild(el0, el1);
                var el1 = dom.createTextNode("\n");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                return fragment;
              }
            };
          }());
          var child1 = (function() {
            return {
              isHTMLBars: true,
              revision: "Ember@1.11.3",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createTextNode("                                ");
                dom.appendChild(el0, el1);
                var el1 = dom.createElement("span");
                dom.setAttribute(el1,"class","description");
                var el2 = dom.createTextNode("Invitation sent: ");
                dom.appendChild(el1, el2);
                var el2 = dom.createComment("");
                dom.appendChild(el1, el2);
                dom.appendChild(el0, el1);
                var el1 = dom.createTextNode("\n");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                var hooks = env.hooks, content = hooks.content;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]),1,1);
                content(env, morph0, context, "user.model.created_at");
                return fragment;
              }
            };
          }());
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("                ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("div");
              dom.setAttribute(el1,"class","user-list-item");
              var el2 = dom.createTextNode("\n                    ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("span");
              dom.setAttribute(el2,"class","user-list-item-icon icon-mail");
              var el3 = dom.createTextNode("ic");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n\n                    ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("div");
              dom.setAttribute(el2,"class","user-list-item-body");
              var el3 = dom.createTextNode("\n                        ");
              dom.appendChild(el2, el3);
              var el3 = dom.createElement("span");
              dom.setAttribute(el3,"class","name");
              var el4 = dom.createComment("");
              dom.appendChild(el3, el4);
              dom.appendChild(el2, el3);
              var el3 = dom.createElement("br");
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("\n");
              dom.appendChild(el2, el3);
              var el3 = dom.createComment("");
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("                    ");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                    ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("aside");
              dom.setAttribute(el2,"class","user-list-item-aside");
              var el3 = dom.createTextNode("\n                        ");
              dom.appendChild(el2, el3);
              var el3 = dom.createElement("a");
              dom.setAttribute(el3,"class","user-list-action");
              dom.setAttribute(el3,"href","#");
              var el4 = dom.createTextNode("Revoke");
              dom.appendChild(el3, el4);
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("\n                        ");
              dom.appendChild(el2, el3);
              var el3 = dom.createElement("a");
              dom.setAttribute(el3,"class","user-list-action");
              dom.setAttribute(el3,"href","#");
              var el4 = dom.createTextNode("Resend");
              dom.appendChild(el3, el4);
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("\n                    ");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                ");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content, get = hooks.get, block = hooks.block, element = hooks.element;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var element3 = dom.childAt(fragment, [1]);
              var element4 = dom.childAt(element3, [3]);
              var element5 = dom.childAt(element3, [5]);
              var element6 = dom.childAt(element5, [1]);
              var element7 = dom.childAt(element5, [3]);
              var morph0 = dom.createMorphAt(dom.childAt(element4, [1]),0,0);
              var morph1 = dom.createMorphAt(element4,4,4);
              content(env, morph0, context, "user.email");
              block(env, morph1, context, "if", [get(env, context, "user.model.pending")], {}, child0, child1);
              element(env, element6, context, "action", ["revoke"], {});
              element(env, element7, context, "action", ["resend"], {});
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("\n        ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("section");
            dom.setAttribute(el1,"class","user-list invited-users");
            var el2 = dom.createTextNode("\n\n            ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("h4");
            dom.setAttribute(el2,"class","user-list-title");
            var el3 = dom.createTextNode("Invited users");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n\n");
            dom.appendChild(el1, el2);
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n        ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]),3,3);
            block(env, morph0, context, "each", [get(env, context, "invitedUsers")], {"itemController": "settings/users/user", "keyword": "user"}, child0, null);
            return fragment;
          }
        };
      }());
      var child3 = (function() {
        var child0 = (function() {
          var child0 = (function() {
            var child0 = (function() {
              return {
                isHTMLBars: true,
                revision: "Ember@1.11.3",
                blockParams: 0,
                cachedFragment: null,
                hasRendered: false,
                build: function build(dom) {
                  var el0 = dom.createDocumentFragment();
                  var el1 = dom.createTextNode("                            ");
                  dom.appendChild(el0, el1);
                  var el1 = dom.createElement("span");
                  var el2 = dom.createComment("");
                  dom.appendChild(el1, el2);
                  dom.appendChild(el0, el1);
                  var el1 = dom.createTextNode("\n");
                  dom.appendChild(el0, el1);
                  return el0;
                },
                render: function render(context, env, contextualElement) {
                  var dom = env.dom;
                  var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, content = hooks.content;
                  dom.detectNamespace(contextualElement);
                  var fragment;
                  if (env.useFragmentCache && dom.canClone) {
                    if (this.cachedFragment === null) {
                      fragment = this.build(dom);
                      if (this.hasRendered) {
                        this.cachedFragment = fragment;
                      } else {
                        this.hasRendered = true;
                      }
                    }
                    if (this.cachedFragment) {
                      fragment = dom.cloneNode(this.cachedFragment, true);
                    }
                  } else {
                    fragment = this.build(dom);
                  }
                  var element0 = dom.childAt(fragment, [1]);
                  var morph0 = dom.createMorphAt(element0,0,0);
                  var attrMorph0 = dom.createAttrMorph(element0, 'class');
                  attribute(env, attrMorph0, element0, "class", concat(env, ["role-label ", get(env, context, "role.lowerCaseName")]));
                  content(env, morph0, context, "role.name");
                  return fragment;
                }
              };
            }());
            return {
              isHTMLBars: true,
              revision: "Ember@1.11.3",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createComment("");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                var hooks = env.hooks, get = hooks.get, block = hooks.block;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
                dom.insertBoundary(fragment, null);
                dom.insertBoundary(fragment, 0);
                block(env, morph0, context, "each", [get(env, context, "user.model.roles")], {"keyword": "role"}, child0, null);
                return fragment;
              }
            };
          }());
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.3",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("                ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("span");
              dom.setAttribute(el1,"class","user-list-item-figure");
              var el2 = dom.createTextNode("\n                    ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("span");
              dom.setAttribute(el2,"class","hidden");
              var el3 = dom.createTextNode("Photo of ");
              dom.appendChild(el2, el3);
              var el3 = dom.createComment("");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                ");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n\n                ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("div");
              dom.setAttribute(el1,"class","user-list-item-body");
              var el2 = dom.createTextNode("\n                    ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("span");
              dom.setAttribute(el2,"class","name");
              var el3 = dom.createTextNode("\n                        ");
              dom.appendChild(el2, el3);
              var el3 = dom.createComment("");
              dom.appendChild(el2, el3);
              var el3 = dom.createTextNode("\n                    ");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                    ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("br");
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                    ");
              dom.appendChild(el1, el2);
              var el2 = dom.createElement("span");
              dom.setAttribute(el2,"class","description");
              var el3 = dom.createTextNode("Last seen: ");
              dom.appendChild(el2, el3);
              var el3 = dom.createComment("");
              dom.appendChild(el2, el3);
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("\n                ");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n                ");
              dom.appendChild(el0, el1);
              var el1 = dom.createElement("aside");
              dom.setAttribute(el1,"class","user-list-item-aside");
              var el2 = dom.createTextNode("\n");
              dom.appendChild(el1, el2);
              var el2 = dom.createComment("");
              dom.appendChild(el1, el2);
              var el2 = dom.createTextNode("                ");
              dom.appendChild(el1, el2);
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, get = hooks.get, attribute = hooks.attribute, content = hooks.content, block = hooks.block;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var element1 = dom.childAt(fragment, [1]);
              var element2 = dom.childAt(fragment, [3]);
              var attrMorph0 = dom.createAttrMorph(element1, 'style');
              var morph0 = dom.createMorphAt(dom.childAt(element1, [1]),1,1);
              var morph1 = dom.createMorphAt(dom.childAt(element2, [1]),1,1);
              var morph2 = dom.createMorphAt(dom.childAt(element2, [5]),1,1);
              var morph3 = dom.createMorphAt(dom.childAt(fragment, [5]),1,1);
              attribute(env, attrMorph0, element1, "style", get(env, context, "user.userImageBackground"));
              content(env, morph0, context, "user.model.name");
              content(env, morph1, context, "user.model.name");
              content(env, morph2, context, "user.last_login");
              block(env, morph3, context, "unless", [get(env, context, "user.model.isAuthor")], {}, child0, null);
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            block(env, morph0, context, "link-to", ["settings.users.user", get(env, context, "user.model")], {"class": "user-list-item"}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("header");
          dom.setAttribute(el1,"class","settings-view-header user-list-header");
          var el2 = dom.createTextNode("\n");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("h2");
          dom.setAttribute(el2,"class","page-title");
          var el3 = dom.createTextNode("Users");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n        ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("section");
          dom.setAttribute(el2,"class","page-actions");
          var el3 = dom.createTextNode("\n            ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("button");
          dom.setAttribute(el3,"class","btn btn-green");
          var el4 = dom.createTextNode("New User");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("section");
          dom.setAttribute(el1,"class","content settings-users");
          var el2 = dom.createTextNode("\n\n");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("section");
          dom.setAttribute(el2,"class","user-list active-users");
          var el3 = dom.createTextNode("\n\n        ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("h4");
          dom.setAttribute(el3,"class","user-list-title");
          var el4 = dom.createTextNode("Active users");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n\n");
          dom.appendChild(el2, el3);
          var el3 = dom.createComment("");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n    ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block, element = hooks.element;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element8 = dom.childAt(fragment, [1]);
          var element9 = dom.childAt(element8, [5, 1]);
          var element10 = dom.childAt(fragment, [3]);
          var morph0 = dom.createMorphAt(element8,1,1);
          var morph1 = dom.createMorphAt(element10,1,1);
          var morph2 = dom.createMorphAt(dom.childAt(element10, [3]),3,3);
          block(env, morph0, context, "if", [get(env, context, "session.user.isEditor")], {}, child0, child1);
          element(env, element9, context, "action", ["openModal", "invite-new-user"], {});
          block(env, morph1, context, "if", [get(env, context, "invitedUsers")], {}, child2, null);
          block(env, morph2, context, "each", [get(env, context, "activeUsers")], {"itemController": "settings/users/user", "keyword": "user"}, child3, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "view", ["settings/users/users-list-view"], {"class": "users-list-wrapper js-users-list-view"}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/settings/users/user', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createElement("i");
            dom.setAttribute(el1,"class","icon-chevron-left");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("Users");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          block(env, morph0, context, "link-to", ["settings.users"], {"class": "btn btn-default btn-back", "tagName": "button"}, child0, null);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                    ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("i");
            dom.setAttribute(el1,"class","icon-settings");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n                    ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("span");
            dom.setAttribute(el1,"class","hidden");
            var el2 = dom.createTextNode("User Settings");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.3",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                    ");
            dom.appendChild(el0, el1);
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
            inline(env, morph0, context, "partial", ["user-actions-menu"], {});
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("span");
          dom.setAttribute(el1,"class","dropdown");
          var el2 = dom.createTextNode("\n");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(element0,1,1);
          var morph1 = dom.createMorphAt(element0,2,2);
          block(env, morph0, context, "gh-dropdown-button", [], {"dropdownName": "user-actions-menu", "classNames": "btn btn-default only-has-icon user-actions-cog", "title": "User Actions"}, child0, null);
          block(env, morph1, context, "gh-dropdown", [], {"name": "user-actions-menu", "tagName": "ul", "classNames": "user-actions-menu dropdown-menu dropdown-triangle-top-right"}, child1, null);
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","form-group");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("label");
          dom.setAttribute(el2,"for","user-role");
          var el3 = dom.createTextNode("Role");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("p");
          var el3 = dom.createTextNode("What permissions should this user have?");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]),3,3);
          inline(env, morph0, context, "gh-role-selector", [], {"initialValue": get(env, context, "user.role"), "onChange": "changeRole", "selectId": "user-role"});
          return fragment;
        }
      };
    }());
    var child3 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.3",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","form-group");
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("label");
          dom.setAttribute(el2,"for","user-password-old");
          var el3 = dom.createTextNode("Old Password");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n                ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n            ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]),3,3);
          inline(env, morph0, context, "input", [], {"value": get(env, context, "user.password"), "type": "password", "id": "user-password-old"});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("header");
        dom.setAttribute(el1,"class","settings-subview-header clearfix");
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"class","page-title");
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","page-actions");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"class","btn btn-blue");
        var el4 = dom.createTextNode("Save");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","content settings-user");
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("figure");
        dom.setAttribute(el2,"class","user-cover");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"class","btn btn-default user-cover-edit js-modal-cover");
        var el4 = dom.createTextNode("Change Cover");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"class","user-profile");
        dom.setAttribute(el2,"novalidate","novalidate");
        dom.setAttribute(el2,"autocomplete","off");
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("input");
        dom.setAttribute(el3,"style","display:none;");
        dom.setAttribute(el3,"type","text");
        dom.setAttribute(el3,"name","fakeusernameremembered");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("input");
        dom.setAttribute(el3,"style","display:none;");
        dom.setAttribute(el3,"type","password");
        dom.setAttribute(el3,"name","fakepasswordremembered");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        dom.setAttribute(el3,"class","user-details-top");
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("figure");
        dom.setAttribute(el4,"class","user-image");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"id","user-image");
        dom.setAttribute(el5,"class","img");
        var el6 = dom.createElement("span");
        dom.setAttribute(el6,"class","hidden");
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\"s Picture");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","button");
        dom.setAttribute(el5,"class","edit-user-image js-modal-image");
        var el6 = dom.createTextNode("Edit Picture");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group first-form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","user-name");
        var el6 = dom.createTextNode("Full Name");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Use your real name so people can recognise you");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        dom.setAttribute(el3,"class","user-details-bottom");
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","user-slug");
        var el6 = dom.createTextNode("Slug");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("/author/");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","user-email");
        var el6 = dom.createTextNode("Email");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Used for notifications");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","user-location");
        var el6 = dom.createTextNode("Location");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Where in the world do you live?");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","user-website");
        var el6 = dom.createTextNode("Website");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Have a website or blog other than this one? Link it!");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group bio-container");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","user-bio");
        var el6 = dom.createTextNode("Bio");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("\n                    Write about you, in 200 characters or less.\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("hr");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("fieldset");
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","user-password-new");
        var el6 = dom.createTextNode("New Password");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","user-new-password-verification");
        var el6 = dom.createTextNode("Verify Password");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","button");
        dom.setAttribute(el5,"class","btn btn-red button-change-password");
        var el6 = dom.createTextNode("Change Password");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block, content = hooks.content, element = hooks.element, attribute = hooks.attribute, inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element1 = dom.childAt(fragment, [0]);
        var element2 = dom.childAt(element1, [5]);
        var element3 = dom.childAt(element2, [3]);
        var element4 = dom.childAt(fragment, [2]);
        var element5 = dom.childAt(element4, [1]);
        var element6 = dom.childAt(element5, [1]);
        var element7 = dom.childAt(element4, [3]);
        var element8 = dom.childAt(element7, [5]);
        var element9 = dom.childAt(element8, [1]);
        var element10 = dom.childAt(element9, [1]);
        var element11 = dom.childAt(element9, [3]);
        var element12 = dom.childAt(element7, [7]);
        var element13 = dom.childAt(element12, [1]);
        var element14 = dom.childAt(element13, [5]);
        var element15 = dom.childAt(element12, [11]);
        var element16 = dom.childAt(element7, [9]);
        var element17 = dom.childAt(element16, [7, 1]);
        var morph0 = dom.createMorphAt(element1,1,1);
        var morph1 = dom.createMorphAt(dom.childAt(element1, [3]),0,0);
        var morph2 = dom.createMorphAt(element2,1,1);
        var attrMorph0 = dom.createAttrMorph(element5, 'style');
        var attrMorph1 = dom.createAttrMorph(element10, 'style');
        var morph3 = dom.createMorphAt(dom.childAt(element10, [0]),0,0);
        var morph4 = dom.createMorphAt(dom.childAt(element8, [3]),3,3);
        var morph5 = dom.createMorphAt(element13,3,3);
        var morph6 = dom.createMorphAt(element14,0,0);
        var morph7 = dom.createMorphAt(element14,2,2);
        var morph8 = dom.createMorphAt(dom.childAt(element12, [3]),3,3);
        var morph9 = dom.createMorphAt(element12,5,5);
        var morph10 = dom.createMorphAt(dom.childAt(element12, [7]),3,3);
        var morph11 = dom.createMorphAt(dom.childAt(element12, [9]),3,3);
        var morph12 = dom.createMorphAt(element15,3,3);
        var morph13 = dom.createMorphAt(dom.childAt(element15, [5]),1,1);
        var morph14 = dom.createMorphAt(element16,1,1);
        var morph15 = dom.createMorphAt(dom.childAt(element16, [3]),3,3);
        var morph16 = dom.createMorphAt(dom.childAt(element16, [5]),3,3);
        block(env, morph0, context, "unless", [get(env, context, "session.user.isAuthor")], {}, child0, null);
        content(env, morph1, context, "user.name");
        block(env, morph2, context, "if", [get(env, context, "view.userActionsAreVisible")], {}, child1, null);
        element(env, element3, context, "action", ["save"], {});
        attribute(env, attrMorph0, element5, "style", get(env, context, "coverImageBackground"));
        element(env, element6, context, "action", ["openModal", "upload", get(env, context, "user"), "cover"], {});
        attribute(env, attrMorph1, element10, "style", get(env, context, "userImageBackground"));
        content(env, morph3, context, "user.name");
        element(env, element11, context, "action", ["openModal", "upload", get(env, context, "user"), "image"], {});
        inline(env, morph4, context, "input", [], {"value": get(env, context, "user.name"), "id": "user-name", "class": "user-name", "placeholder": "Full Name", "autocorrect": "off"});
        inline(env, morph5, context, "gh-input", [], {"class": "user-name", "id": "user-slug", "value": get(env, context, "slugValue"), "name": "user", "focus-out": "updateSlug", "placeholder": "Slug", "selectOnClick": "true", "autocorrect": "off"});
        content(env, morph6, context, "gh-blog-url");
        content(env, morph7, context, "slugValue");
        inline(env, morph8, context, "input", [], {"type": "email", "value": get(env, context, "user.email"), "id": "user-email", "placeholder": "Email Address", "autocapitalize": "off", "autocorrect": "off", "autocomplete": "off"});
        block(env, morph9, context, "if", [get(env, context, "view.rolesDropdownIsVisible")], {}, child2, null);
        inline(env, morph10, context, "input", [], {"type": "text", "value": get(env, context, "user.location"), "id": "user-location"});
        inline(env, morph11, context, "input", [], {"type": "url", "value": get(env, context, "user.website"), "id": "user-website", "autocapitalize": "off", "autocorrect": "off", "autocomplete": "off"});
        inline(env, morph12, context, "textarea", [], {"id": "user-bio", "value": get(env, context, "user.bio")});
        inline(env, morph13, context, "gh-count-characters", [get(env, context, "user.bio")], {});
        block(env, morph14, context, "unless", [get(env, context, "view.isNotOwnProfile")], {}, child3, null);
        inline(env, morph15, context, "input", [], {"value": get(env, context, "user.newPassword"), "type": "password", "id": "user-password-new"});
        inline(env, morph16, context, "input", [], {"value": get(env, context, "user.ne2Password"), "type": "password", "id": "user-new-password-verification"});
        element(env, element17, context, "action", ["password"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/setup', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","setup-box js-setup-box fade-in");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","vertical");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("form");
        dom.setAttribute(el3,"id","setup");
        dom.setAttribute(el3,"class","setup-form");
        dom.setAttribute(el3,"method","post");
        dom.setAttribute(el3,"novalidate","novalidate");
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("input");
        dom.setAttribute(el4,"style","display:none;");
        dom.setAttribute(el4,"type","text");
        dom.setAttribute(el4,"name","fakeusernameremembered");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("input");
        dom.setAttribute(el4,"style","display:none;");
        dom.setAttribute(el4,"type","password");
        dom.setAttribute(el4,"name","fakepasswordremembered");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("header");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h1");
        var el6 = dom.createTextNode("Welcome to your new Ghost blog");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h2");
        var el6 = dom.createTextNode("Let's get a few things set up so you can get started.");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","blog-title");
        var el6 = dom.createTextNode("Blog Title");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("What would you like to call your blog?");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","name");
        var el6 = dom.createTextNode("Full Name");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("The name that you will sign your posts with");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","email");
        var el6 = dom.createTextNode("Email Address");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Used for important notifications");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","password");
        var el6 = dom.createTextNode("Password");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Must be at least 8 characters");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("footer");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","submit");
        dom.setAttribute(el5,"class","btn btn-green btn-lg");
        var el6 = dom.createTextNode("Ok, Let's Do This");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, inline = hooks.inline, attribute = hooks.attribute, element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1, 1]);
        var element1 = dom.childAt(element0, [15, 1]);
        var morph0 = dom.createMorphAt(dom.childAt(element0, [7]),3,3);
        var morph1 = dom.createMorphAt(dom.childAt(element0, [9]),3,3);
        var morph2 = dom.createMorphAt(dom.childAt(element0, [11]),3,3);
        var morph3 = dom.createMorphAt(dom.childAt(element0, [13]),3,3);
        var attrMorph0 = dom.createAttrMorph(element1, 'disabled');
        inline(env, morph0, context, "input", [], {"type": "text", "name": "blog-title", "autofocus": "autofocus", "autocorrect": "off", "value": get(env, context, "blogTitle")});
        inline(env, morph1, context, "input", [], {"type": "text", "name": "name", "autofocus": "autofocus", "autocorrect": "off", "value": get(env, context, "name")});
        inline(env, morph2, context, "input", [], {"type": "email", "name": "email", "autofocus": "autofocus", "autocorrect": "off", "value": get(env, context, "email")});
        inline(env, morph3, context, "input", [], {"type": "password", "name": "password", "autofocus": "autofocus", "autocorrect": "off", "value": get(env, context, "password")});
        attribute(env, attrMorph0, element1, "disabled", get(env, context, "submitting"));
        element(env, element1, context, "action", ["setup"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/signin', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","login-box js-login-box fade-in");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("form");
        dom.setAttribute(el2,"id","login");
        dom.setAttribute(el2,"class","login-form");
        dom.setAttribute(el2,"method","post");
        dom.setAttribute(el2,"novalidate","novalidate");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","email-wrap");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("span");
        dom.setAttribute(el4,"class","input-icon icon-mail");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","password-wrap");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("span");
        dom.setAttribute(el4,"class","input-icon icon-lock");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("button");
        dom.setAttribute(el3,"class","btn btn-blue");
        dom.setAttribute(el3,"type","submit");
        var el4 = dom.createTextNode("Log in");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("section");
        dom.setAttribute(el3,"class","meta");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("button");
        dom.setAttribute(el4,"class","forgotten-link btn btn-link");
        var el5 = dom.createTextNode("Forgotten password?");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, element = hooks.element, get = hooks.get, inline = hooks.inline, attribute = hooks.attribute;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1]);
        var element1 = dom.childAt(element0, [5]);
        var element2 = dom.childAt(element0, [7, 1]);
        var morph0 = dom.createMorphAt(dom.childAt(element0, [1, 1]),1,1);
        var morph1 = dom.createMorphAt(dom.childAt(element0, [3, 1]),1,1);
        var attrMorph0 = dom.createAttrMorph(element1, 'disabled');
        element(env, element0, context, "action", ["validateAndAuthenticate"], {"on": "submit"});
        inline(env, morph0, context, "gh-trim-focus-input", [], {"class": "email", "type": "email", "placeholder": "Email Address", "name": "identification", "autocapitalize": "off", "autocorrect": "off", "value": get(env, context, "model.identification")});
        inline(env, morph1, context, "input", [], {"class": "password", "type": "password", "placeholder": "Password", "name": "password", "value": get(env, context, "model.password")});
        attribute(env, attrMorph0, element1, "disabled", get(env, context, "submitting"));
        element(env, element1, context, "action", ["validateAndAuthenticate"], {});
        element(env, element2, context, "action", ["forgotten"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/templates/signup', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.3",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","setup-box js-signup-box fade-in");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","vertical");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("form");
        dom.setAttribute(el3,"id","signup");
        dom.setAttribute(el3,"class","setup-form");
        dom.setAttribute(el3,"method","post");
        dom.setAttribute(el3,"novalidate","novalidate");
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("input");
        dom.setAttribute(el4,"style","display:none;");
        dom.setAttribute(el4,"type","text");
        dom.setAttribute(el4,"name","fakeusernameremembered");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("input");
        dom.setAttribute(el4,"style","display:none;");
        dom.setAttribute(el4,"type","password");
        dom.setAttribute(el4,"name","fakepasswordremembered");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("header");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h1");
        var el6 = dom.createTextNode("Welcome to Ghost");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h2");
        var el6 = dom.createTextNode("Create your account to start publishing");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","email");
        var el6 = dom.createTextNode("Email Address");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Used for important notifications");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","name");
        var el6 = dom.createTextNode("Full Name");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("The name that you will sign your posts with");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","form-group");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("label");
        dom.setAttribute(el5,"for","password");
        var el6 = dom.createTextNode("Password");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("p");
        var el6 = dom.createTextNode("Must be at least 8 characters");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("footer");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","submit");
        dom.setAttribute(el5,"class","btn btn-green btn-lg");
        var el6 = dom.createTextNode("Create Account");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, inline = hooks.inline, attribute = hooks.attribute, element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1, 1]);
        var element1 = dom.childAt(element0, [13, 1]);
        var morph0 = dom.createMorphAt(dom.childAt(element0, [7]),3,3);
        var morph1 = dom.createMorphAt(dom.childAt(element0, [9]),3,3);
        var morph2 = dom.createMorphAt(dom.childAt(element0, [11]),3,3);
        var attrMorph0 = dom.createAttrMorph(element1, 'disabled');
        inline(env, morph0, context, "input", [], {"type": "email", "name": "email", "autocorrect": "off", "value": get(env, context, "model.email")});
        inline(env, morph1, context, "gh-trim-focus-input", [], {"type": "text", "name": "name", "autofocus": "autofocus", "autocorrect": "off", "value": get(env, context, "model.name")});
        inline(env, morph2, context, "input", [], {"type": "password", "name": "password", "autofocus": "autofocus", "autocorrect": "off", "value": get(env, context, "model.password")});
        attribute(env, attrMorph0, element1, "disabled", get(env, context, "submitting"));
        element(env, element1, context, "action", ["signup"], {});
        return fragment;
      }
    };
  }()));

});
define('ghost/tests/helpers/resolver', ['exports', 'ember/resolver', 'ghost/config/environment'], function (exports, Resolver, config) {

    'use strict';

    var resolver = Resolver['default'].create();

    resolver.namespace = {
        modulePrefix: config['default'].modulePrefix,
        podModulePrefix: config['default'].podModulePrefix
    };

    exports['default'] = resolver;

});
define('ghost/tests/helpers/start-app', ['exports', 'ember', 'ghost/app', 'ghost/router', 'ghost/config/environment'], function (exports, Ember, Application, Router, config) {

    'use strict';

    function startApp(attrs) {
        var application,
            attributes = Ember['default'].merge({}, config['default'].APP);

        attributes = Ember['default'].merge(attributes, attrs); // use defaults, but you can override;

        Ember['default'].run(function () {
            application = Application['default'].create(attributes);
            application.setupForTesting();
            application.injectTestHelpers();
        });

        return application;
    }

    exports['default'] = startApp;

});
define('ghost/tests/test-helper', ['ghost/tests/helpers/resolver', 'ember-mocha'], function (resolver, ember_mocha) {

	'use strict';

	ember_mocha.setResolver(resolver['default']);

});
define('ghost/tests/unit/components/gh-trim-focus-input_test', ['ember', 'ember-mocha'], function (Ember, ember_mocha) {

    'use strict';

    ember_mocha.describeComponent("gh-trim-focus-input", function () {
        ember_mocha.it("trims value on focusOut", function () {
            var component = this.subject({
                value: "some random stuff   "
            });

            this.render();

            component.$().focusout();
            expect(component.$().val()).to.equal("some random stuff");
        });

        ember_mocha.it("does not have the autofocus attribute if not set to focus", function () {
            var component = this.subject({
                value: "some text",
                focus: false
            });

            this.render();

            expect(component.$().attr("autofocus")).to.not.be.ok;
        });

        ember_mocha.it("has the autofocus attribute if set to focus", function () {
            var component = this.subject({
                value: "some text",
                focus: true
            });

            this.render();

            expect(component.$().attr("autofocus")).to.be.ok;
        });
    });

});
define('ghost/tests/unit/components/gh-url-preview_test', ['ember-mocha'], function (ember_mocha) {

    'use strict';

    ember_mocha.describeComponent("gh-url-preview", function () {
        ember_mocha.it("generates the correct preview URL with a prefix", function () {
            var component = this.subject({
                prefix: "tag",
                slug: "test-slug",
                tagName: "p",
                classNames: "test-class",

                config: { blogUrl: "http://my-ghost-blog.com" }
            });

            this.render();

            expect(component.get("url")).to.equal("my-ghost-blog.com/tag/test-slug/");
        });

        ember_mocha.it("generates the correct preview URL without a prefix", function () {
            var component = this.subject({
                slug: "test-slug",
                tagName: "p",
                classNames: "test-class",

                config: { blogUrl: "http://my-ghost-blog.com" }
            });

            this.render();

            expect(component.get("url")).to.equal("my-ghost-blog.com/test-slug/");
        });
    });

});
define('ghost/tests/unit/controllers/post-settings-menu_test', ['ember', 'ember-mocha'], function (Ember, ember_mocha) {

    'use strict';

    ember_mocha.describeModule("controller:post-settings-menu", {
        needs: ["controller:application"]
    }, function () {
        ember_mocha.it("slugValue is one-way bound to model.slug", function () {
            var controller = this.subject({
                model: Ember['default'].Object.create({
                    slug: "a-slug"
                })
            });

            expect(controller.get("model.slug")).to.equal("a-slug");
            expect(controller.get("slugValue")).to.equal("a-slug");

            Ember['default'].run(function () {
                controller.set("model.slug", "changed-slug");

                expect(controller.get("slugValue")).to.equal("changed-slug");
            });

            Ember['default'].run(function () {
                controller.set("slugValue", "changed-directly");

                expect(controller.get("model.slug")).to.equal("changed-slug");
                expect(controller.get("slugValue")).to.equal("changed-directly");
            });

            Ember['default'].run(function () {
                // test that the one-way binding is still in place
                controller.set("model.slug", "should-update");

                expect(controller.get("slugValue")).to.equal("should-update");
            });
        });

        ember_mocha.it("metaTitleScratch is one-way bound to model.meta_title", function () {
            var controller = this.subject({
                model: Ember['default'].Object.create({
                    meta_title: "a title"
                })
            });

            expect(controller.get("model.meta_title")).to.equal("a title");
            expect(controller.get("metaTitleScratch")).to.equal("a title");

            Ember['default'].run(function () {
                controller.set("model.meta_title", "a different title");

                expect(controller.get("metaTitleScratch")).to.equal("a different title");
            });

            Ember['default'].run(function () {
                controller.set("metaTitleScratch", "changed directly");

                expect(controller.get("model.meta_title")).to.equal("a different title");
                expect(controller.get("metaTitleScratch")).to.equal("changed directly");
            });

            Ember['default'].run(function () {
                // test that the one-way binding is still in place
                controller.set("model.meta_title", "should update");

                expect(controller.get("metaTitleScratch")).to.equal("should update");
            });
        });

        ember_mocha.it("metaDescriptionScratch is one-way bound to model.meta_description", function () {
            var controller = this.subject({
                model: Ember['default'].Object.create({
                    meta_description: "a description"
                })
            });

            expect(controller.get("model.meta_description")).to.equal("a description");
            expect(controller.get("metaDescriptionScratch")).to.equal("a description");

            Ember['default'].run(function () {
                controller.set("model.meta_description", "a different description");

                expect(controller.get("metaDescriptionScratch")).to.equal("a different description");
            });

            Ember['default'].run(function () {
                controller.set("metaDescriptionScratch", "changed directly");

                expect(controller.get("model.meta_description")).to.equal("a different description");
                expect(controller.get("metaDescriptionScratch")).to.equal("changed directly");
            });

            Ember['default'].run(function () {
                // test that the one-way binding is still in place
                controller.set("model.meta_description", "should update");

                expect(controller.get("metaDescriptionScratch")).to.equal("should update");
            });
        });

        describe("seoTitle", function () {
            ember_mocha.it("should be the meta_title if one exists", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        meta_title: "a meta-title",
                        titleScratch: "should not be used"
                    })
                });

                expect(controller.get("seoTitle")).to.equal("a meta-title");
            });

            ember_mocha.it("should default to the title if an explicit meta-title does not exist", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        titleScratch: "should be the meta-title"
                    })
                });

                expect(controller.get("seoTitle")).to.equal("should be the meta-title");
            });

            ember_mocha.it("should be the meta_title if both title and meta_title exist", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        meta_title: "a meta-title",
                        titleScratch: "a title"
                    })
                });

                expect(controller.get("seoTitle")).to.equal("a meta-title");
            });

            ember_mocha.it("should revert to the title if explicit meta_title is removed", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        meta_title: "a meta-title",
                        titleScratch: "a title"
                    })
                });

                expect(controller.get("seoTitle")).to.equal("a meta-title");

                Ember['default'].run(function () {
                    controller.set("model.meta_title", "");

                    expect(controller.get("seoTitle")).to.equal("a title");
                });
            });

            ember_mocha.it("should truncate to 70 characters with an appended ellipsis", function () {
                var longTitle, controller;

                longTitle = new Array(100).join("a");
                expect(longTitle.length).to.equal(99);

                controller = this.subject({
                    model: Ember['default'].Object.create()
                });

                Ember['default'].run(function () {
                    var expected = longTitle.substr(0, 70) + "&hellip;";

                    controller.set("metaTitleScratch", longTitle);

                    expect(controller.get("seoTitle").toString().length).to.equal(78);
                    expect(controller.get("seoTitle").toString()).to.equal(expected);
                });
            });
        });

        describe("seoDescription", function () {
            ember_mocha.it("should be the meta_description if one exists", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        meta_description: "a description"
                    })
                });

                expect(controller.get("seoDescription")).to.equal("a description");
            });

            ember_mocha.it.skip("should be generated from the rendered markdown if not explicitly set", function () {});

            ember_mocha.it("should truncate to 156 characters with an appended ellipsis", function () {
                var longDescription, controller;

                longDescription = new Array(200).join("a");
                expect(longDescription.length).to.equal(199);

                controller = this.subject({
                    model: Ember['default'].Object.create()
                });

                Ember['default'].run(function () {
                    var expected = longDescription.substr(0, 156) + "&hellip;";

                    controller.set("metaDescriptionScratch", longDescription);

                    expect(controller.get("seoDescription").toString().length).to.equal(164);
                    expect(controller.get("seoDescription").toString()).to.equal(expected);
                });
            });
        });

        describe("seoURL", function () {
            ember_mocha.it("should be the URL of the blog if no post slug exists", function () {
                var controller = this.subject({
                    config: Ember['default'].Object.create({ blogUrl: "http://my-ghost-blog.com" }),
                    model: Ember['default'].Object.create()
                });

                expect(controller.get("seoURL")).to.equal("http://my-ghost-blog.com/");
            });

            ember_mocha.it("should be the URL of the blog plus the post slug", function () {
                var controller = this.subject({
                    config: Ember['default'].Object.create({ blogUrl: "http://my-ghost-blog.com" }),
                    model: Ember['default'].Object.create({ slug: "post-slug" })
                });

                expect(controller.get("seoURL")).to.equal("http://my-ghost-blog.com/post-slug/");
            });

            ember_mocha.it("should update when the post slug changes", function () {
                var controller = this.subject({
                    config: Ember['default'].Object.create({ blogUrl: "http://my-ghost-blog.com" }),
                    model: Ember['default'].Object.create({ slug: "post-slug" })
                });

                expect(controller.get("seoURL")).to.equal("http://my-ghost-blog.com/post-slug/");

                Ember['default'].run(function () {
                    controller.set("model.slug", "changed-slug");

                    expect(controller.get("seoURL")).to.equal("http://my-ghost-blog.com/changed-slug/");
                });
            });

            ember_mocha.it("should truncate a long URL to 70 characters with an appended ellipsis", function () {
                var longSlug,
                    blogURL = "http://my-ghost-blog.com",
                    expected,
                    controller;

                longSlug = new Array(75).join("a");
                expect(longSlug.length).to.equal(74);

                controller = this.subject({
                    config: Ember['default'].Object.create({ blogUrl: blogURL }),
                    model: Ember['default'].Object.create({ slug: longSlug })
                });

                expected = blogURL + "/" + longSlug + "/";
                expected = expected.substr(0, 70) + "&hellip;";

                expect(controller.get("seoURL").toString().length).to.equal(78);
                expect(controller.get("seoURL").toString()).to.equal(expected);
            });
        });

        describe("togglePage", function () {
            ember_mocha.it("should toggle the page property", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        page: false,
                        isNew: true
                    })
                });

                expect(controller.get("model.page")).to.not.be.ok;

                Ember['default'].run(function () {
                    controller.send("togglePage");

                    expect(controller.get("model.page")).to.be.ok;
                });
            });

            ember_mocha.it("should not save the post if it is still new", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        page: false,
                        isNew: true,
                        save: function save() {
                            this.incrementProperty("saved");
                            return Ember['default'].RSVP.resolve();
                        }
                    })
                });

                Ember['default'].run(function () {
                    controller.send("togglePage");

                    expect(controller.get("model.page")).to.be.ok;
                    expect(controller.get("model.saved")).to.not.be.ok;
                });
            });

            ember_mocha.it("should save the post if it is not new", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        page: false,
                        isNew: false,
                        save: function save() {
                            this.incrementProperty("saved");
                            return Ember['default'].RSVP.resolve();
                        }
                    })
                });

                Ember['default'].run(function () {
                    controller.send("togglePage");

                    expect(controller.get("model.page")).to.be.ok;
                    expect(controller.get("model.saved")).to.equal(1);
                });
            });
        });

        describe("toggleFeatured", function () {
            ember_mocha.it("should toggle the featured property", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        featured: false,
                        isNew: true
                    })
                });

                Ember['default'].run(function () {
                    controller.send("toggleFeatured");

                    expect(controller.get("model.featured")).to.be.ok;
                });
            });

            ember_mocha.it("should not save the post if it is still new", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        featured: false,
                        isNew: true,
                        save: function save() {
                            this.incrementProperty("saved");
                            return Ember['default'].RSVP.resolve();
                        }
                    })
                });

                Ember['default'].run(function () {
                    controller.send("toggleFeatured");

                    expect(controller.get("model.featured")).to.be.ok;
                    expect(controller.get("model.saved")).to.not.be.ok;
                });
            });

            ember_mocha.it("should save the post if it is not new", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        featured: false,
                        isNew: false,
                        save: function save() {
                            this.incrementProperty("saved");
                            return Ember['default'].RSVP.resolve();
                        }
                    })
                });

                Ember['default'].run(function () {
                    controller.send("toggleFeatured");

                    expect(controller.get("model.featured")).to.be.ok;
                    expect(controller.get("model.saved")).to.equal(1);
                });
            });
        });

        describe("generateAndSetSlug", function () {
            ember_mocha.it("should generate a slug and set it on the destination", function (done) {
                var controller = this.subject({
                    slugGenerator: Ember['default'].Object.create({
                        generateSlug: function generateSlug(str) {
                            return Ember['default'].RSVP.resolve(str + "-slug");
                        }
                    }),
                    model: Ember['default'].Object.create({ slug: "" })
                });

                Ember['default'].run(function () {
                    controller.set("model.titleScratch", "title");
                    controller.generateAndSetSlug("model.slug");

                    expect(controller.get("model.slug")).to.equal("");

                    Ember['default'].RSVP.resolve(controller.get("lastPromise")).then(function () {
                        expect(controller.get("model.slug")).to.equal("title-slug");

                        done();
                    })["catch"](done);
                });
            });

            ember_mocha.it("should not set the destination if the title is \"(Untitled)\" and the post already has a slug", function (done) {
                var controller = this.subject({
                    slugGenerator: Ember['default'].Object.create({
                        generateSlug: function generateSlug(str) {
                            return Ember['default'].RSVP.resolve(str + "-slug");
                        }
                    }),
                    model: Ember['default'].Object.create({
                        slug: "whatever"
                    })
                });

                expect(controller.get("model.slug")).to.equal("whatever");

                Ember['default'].run(function () {
                    controller.set("model.titleScratch", "title");

                    Ember['default'].RSVP.resolve(controller.get("lastPromise")).then(function () {
                        expect(controller.get("model.slug")).to.equal("whatever");

                        done();
                    })["catch"](done);
                });
            });
        });

        describe("titleObserver", function () {
            ember_mocha.it("should invoke generateAndSetSlug if the post is new and a title has not been set", function (done) {
                var controller = this.subject({
                    model: Ember['default'].Object.create({ isNew: true }),
                    invoked: 0,
                    generateAndSetSlug: function generateAndSetSlug() {
                        this.incrementProperty("invoked");
                    }
                });

                expect(controller.get("invoked")).to.equal(0);
                expect(controller.get("model.title")).to.not.be.ok;

                Ember['default'].run(function () {
                    controller.set("model.titleScratch", "test");

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    Ember['default'].run.later(function () {
                        expect(controller.get("invoked")).to.equal(1);

                        done();
                    }, 800);
                });
            });

            ember_mocha.it("should invoke generateAndSetSlug if the post title is \"(Untitled)\"", function (done) {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        isNew: false,
                        title: "(Untitled)"
                    }),
                    invoked: 0,
                    generateAndSetSlug: function generateAndSetSlug() {
                        this.incrementProperty("invoked");
                    }
                });

                expect(controller.get("invoked")).to.equal(0);
                expect(controller.get("model.title")).to.equal("(Untitled)");

                Ember['default'].run(function () {
                    controller.set("model.titleScratch", "test");

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    Ember['default'].run.later(function () {
                        expect(controller.get("invoked")).to.equal(1);

                        done();
                    }, 800);
                });
            });

            ember_mocha.it("should not invoke generateAndSetSlug if the post is new but has a title", function (done) {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        isNew: true,
                        title: "a title"
                    }),
                    invoked: 0,
                    generateAndSetSlug: function generateAndSetSlug() {
                        this.incrementProperty("invoked");
                    }
                });

                expect(controller.get("invoked")).to.equal(0);
                expect(controller.get("model.title")).to.equal("a title");

                Ember['default'].run(function () {
                    controller.set("model.titleScratch", "test");

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    Ember['default'].run.later(function () {
                        expect(controller.get("invoked")).to.equal(0);

                        done();
                    }, 800);
                });
            });
        });

        describe("updateSlug", function () {
            ember_mocha.it("should reset slugValue to the previous slug when the new slug is blank or unchanged", function () {
                var controller = this.subject({
                    model: Ember['default'].Object.create({
                        slug: "slug"
                    })
                });

                Ember['default'].run(function () {
                    // unchanged
                    controller.set("slugValue", "slug");
                    controller.send("updateSlug", controller.get("slugValue"));

                    expect(controller.get("model.slug")).to.equal("slug");
                    expect(controller.get("slugValue")).to.equal("slug");
                });

                Ember['default'].run(function () {
                    // unchanged after trim
                    controller.set("slugValue", "slug  ");
                    controller.send("updateSlug", controller.get("slugValue"));

                    expect(controller.get("model.slug")).to.equal("slug");
                    expect(controller.get("slugValue")).to.equal("slug");
                });

                Ember['default'].run(function () {
                    // blank
                    controller.set("slugValue", "");
                    controller.send("updateSlug", controller.get("slugValue"));

                    expect(controller.get("model.slug")).to.equal("slug");
                    expect(controller.get("slugValue")).to.equal("slug");
                });
            });

            ember_mocha.it("should not set a new slug if the server-generated slug matches existing slug", function (done) {
                var controller = this.subject({
                    slugGenerator: Ember['default'].Object.create({
                        generateSlug: function generateSlug(str) {
                            var promise;
                            promise = Ember['default'].RSVP.resolve(str.split("#")[0]);
                            this.set("lastPromise", promise);
                            return promise;
                        }
                    }),
                    model: Ember['default'].Object.create({
                        slug: "whatever"
                    })
                });

                Ember['default'].run(function () {
                    controller.set("slugValue", "whatever#slug");
                    controller.send("updateSlug", controller.get("slugValue"));

                    Ember['default'].RSVP.resolve(controller.get("lastPromise")).then(function () {
                        expect(controller.get("model.slug")).to.equal("whatever");

                        done();
                    })["catch"](done);
                });
            });

            ember_mocha.it("should not set a new slug if the only change is to the appended increment value", function (done) {
                var controller = this.subject({
                    slugGenerator: Ember['default'].Object.create({
                        generateSlug: function generateSlug(str) {
                            var promise;
                            promise = Ember['default'].RSVP.resolve(str.replace(/[^a-zA-Z]/g, "") + "-2");
                            this.set("lastPromise", promise);
                            return promise;
                        }
                    }),
                    model: Ember['default'].Object.create({
                        slug: "whatever"
                    })
                });

                Ember['default'].run(function () {
                    controller.set("slugValue", "whatever!");
                    controller.send("updateSlug", controller.get("slugValue"));

                    Ember['default'].RSVP.resolve(controller.get("lastPromise")).then(function () {
                        expect(controller.get("model.slug")).to.equal("whatever");

                        done();
                    })["catch"](done);
                });
            });

            ember_mocha.it("should set the slug if the new slug is different", function (done) {
                var controller = this.subject({
                    slugGenerator: Ember['default'].Object.create({
                        generateSlug: function generateSlug(str) {
                            var promise;
                            promise = Ember['default'].RSVP.resolve(str);
                            this.set("lastPromise", promise);
                            return promise;
                        }
                    }),
                    model: Ember['default'].Object.create({
                        slug: "whatever",
                        save: Ember['default'].K
                    })
                });

                Ember['default'].run(function () {
                    controller.set("slugValue", "changed");
                    controller.send("updateSlug", controller.get("slugValue"));

                    Ember['default'].RSVP.resolve(controller.get("lastPromise")).then(function () {
                        expect(controller.get("model.slug")).to.equal("changed");

                        done();
                    })["catch"](done);
                });
            });

            ember_mocha.it("should save the post when the slug changes and the post is not new", function (done) {
                var controller = this.subject({
                    slugGenerator: Ember['default'].Object.create({
                        generateSlug: function generateSlug(str) {
                            var promise;
                            promise = Ember['default'].RSVP.resolve(str);
                            this.set("lastPromise", promise);
                            return promise;
                        }
                    }),
                    model: Ember['default'].Object.create({
                        slug: "whatever",
                        saved: 0,
                        isNew: false,
                        save: function save() {
                            this.incrementProperty("saved");
                        }
                    })
                });

                Ember['default'].run(function () {
                    controller.set("slugValue", "changed");
                    controller.send("updateSlug", controller.get("slugValue"));

                    Ember['default'].RSVP.resolve(controller.get("lastPromise")).then(function () {
                        expect(controller.get("model.slug")).to.equal("changed");
                        expect(controller.get("model.saved")).to.equal(1);

                        done();
                    })["catch"](done);
                });
            });

            ember_mocha.it("should not save the post when the slug changes and the post is new", function (done) {
                var controller = this.subject({
                    slugGenerator: Ember['default'].Object.create({
                        generateSlug: function generateSlug(str) {
                            var promise;
                            promise = Ember['default'].RSVP.resolve(str);
                            this.set("lastPromise", promise);
                            return promise;
                        }
                    }),
                    model: Ember['default'].Object.create({
                        slug: "whatever",
                        saved: 0,
                        isNew: true,
                        save: function save() {
                            this.incrementProperty("saved");
                        }
                    })
                });

                Ember['default'].run(function () {
                    controller.set("slugValue", "changed");
                    controller.send("updateSlug", controller.get("slugValue"));

                    Ember['default'].RSVP.resolve(controller.get("lastPromise")).then(function () {
                        expect(controller.get("model.slug")).to.equal("changed");
                        expect(controller.get("model.saved")).to.equal(0);

                        done();
                    })["catch"](done);
                });
            });
        });
    });

    // can't test right now because the rendered markdown is being pulled
    // from the DOM via jquery

});
define('ghost/tests/unit/controllers/settings-general_test', ['ember', 'ember-mocha'], function (Ember, ember_mocha) {

    'use strict';

    ember_mocha.describeModule("controller:settings/general", function () {
        ember_mocha.it("isDatedPermalinks should be correct", function () {
            var controller = this.subject({
                model: Ember['default'].Object.create({
                    permalinks: "/:year/:month/:day/:slug/"
                })
            });

            expect(controller.get("isDatedPermalinks")).to.be.ok;

            Ember['default'].run(function () {
                controller.set("model.permalinks", "/:slug/");

                expect(controller.get("isDatedPermalinks")).to.not.be.ok;
            });
        });

        ember_mocha.it("setting isDatedPermalinks should switch between dated and slug", function () {
            var controller = this.subject({
                model: Ember['default'].Object.create({
                    permalinks: "/:year/:month/:day/:slug/"
                })
            });

            Ember['default'].run(function () {
                controller.set("isDatedPermalinks", false);

                expect(controller.get("isDatedPermalinks")).to.not.be.ok;
                expect(controller.get("model.permalinks")).to.equal("/:slug/");
            });

            Ember['default'].run(function () {
                controller.set("isDatedPermalinks", true);

                expect(controller.get("isDatedPermalinks")).to.be.ok;
                expect(controller.get("model.permalinks")).to.equal("/:year/:month/:day/:slug/");
            });
        });

        ember_mocha.it("themes should be correct", function () {
            var controller,
                themes = [];

            themes.push({
                name: "casper",
                active: true,
                "package": {
                    name: "Casper",
                    version: "1.1.5"
                }
            });

            themes.push({
                name: "rasper",
                "package": {
                    name: "Rasper",
                    version: "1.0.0"
                }
            });

            controller = this.subject({
                model: Ember['default'].Object.create({
                    availableThemes: themes
                })
            });

            themes = controller.get("themes");
            expect(themes).to.be.an.Array;
            expect(themes.length).to.equal(2);
            expect(themes.objectAt(0).name).to.equal("casper");
            expect(themes.objectAt(0).active).to.be.ok;
            expect(themes.objectAt(0).label).to.equal("Casper - 1.1.5");
            expect(themes.objectAt(1).name).to.equal("rasper");
            expect(themes.objectAt(1).active).to.not.be.ok;
            expect(themes.objectAt(1).label).to.equal("Rasper - 1.0.0");
        });
    });

});
define('ghost/tests/unit/models/post_test', ['ember', 'ember-mocha'], function (Ember, ember_mocha) {

    'use strict';

    ember_mocha.describeModel("post", {
        needs: ["model:user", "model:tag", "model:role"]
    }, function () {
        ember_mocha.it("has a validation type of \"post\"", function () {
            var model = this.subject();

            expect(model.validationType).to.equal("post");
        });

        ember_mocha.it("isPublished and isDraft are correct", function () {
            var model = this.subject({
                status: "published"
            });

            expect(model.get("isPublished")).to.be.ok;
            expect(model.get("isDraft")).to.not.be.ok;

            Ember['default'].run(function () {
                model.set("status", "draft");

                expect(model.get("isPublished")).to.not.be.ok;
                expect(model.get("isDraft")).to.be.ok;
            });
        });

        ember_mocha.it("isAuthoredByUser is correct", function () {
            var model = this.subject({
                author_id: 15
            }),
                user = Ember['default'].Object.create({ id: "15" });

            expect(model.isAuthoredByUser(user)).to.be.ok;

            Ember['default'].run(function () {
                model.set("author_id", 1);

                expect(model.isAuthoredByUser(user)).to.not.be.ok;
            });
        });

        ember_mocha.it("updateTags removes and deletes old tags", function () {
            var model = this.subject();

            Ember['default'].run(this, function () {
                var modelTags = model.get("tags"),
                    tag1 = this.store().createRecord("tag", { id: "1" }),
                    tag2 = this.store().createRecord("tag", { id: "2" }),
                    tag3 = this.store().createRecord("tag");

                // During testing a record created without an explicit id will get
                // an id of 'fixture-n' instead of null
                tag3.set("id", null);

                modelTags.pushObject(tag1);
                modelTags.pushObject(tag2);
                modelTags.pushObject(tag3);

                expect(model.get("tags.length")).to.equal(3);

                model.updateTags();

                expect(model.get("tags.length")).to.equal(2);
                expect(model.get("tags.firstObject.id")).to.equal("1");
                expect(model.get("tags").objectAt(1).get("id")).to.equal("2");
                expect(tag1.get("isDeleted")).to.not.be.ok;
                expect(tag2.get("isDeleted")).to.not.be.ok;
                expect(tag3.get("isDeleted")).to.be.ok;
            });
        });
    });

});
define('ghost/tests/unit/models/role_test', ['ember', 'ember-mocha'], function (Ember, ember_mocha) {

    'use strict';

    ember_mocha.describeModel("role", function () {
        ember_mocha.it("provides a lowercase version of the name", function () {
            var model = this.subject({
                name: "Author"
            });

            expect(model.get("name")).to.equal("Author");
            expect(model.get("lowerCaseName")).to.equal("author");

            Ember['default'].run(function () {
                model.set("name", "Editor");

                expect(model.get("name")).to.equal("Editor");
                expect(model.get("lowerCaseName")).to.equal("editor");
            });
        });
    });

});
define('ghost/tests/unit/models/setting_test', ['ember-mocha'], function (ember_mocha) {

    'use strict';

    ember_mocha.describeModel("setting", function () {
        ember_mocha.it("has a validation type of \"setting\"", function () {
            var model = this.subject();

            expect(model.get("validationType")).to.equal("setting");
        });
    });

});
define('ghost/tests/unit/models/tag_test', ['ember-mocha'], function (ember_mocha) {

    'use strict';

    ember_mocha.describeModel("tag", function () {
        ember_mocha.it("has a validation type of \"tag\"", function () {
            var model = this.subject();

            expect(model.get("validationType")).to.equal("tag");
        });
    });

});
define('ghost/tests/unit/models/user_test', ['ember', 'ember-mocha'], function (Ember, ember_mocha) {

    'use strict';

    ember_mocha.describeModel("user", {
        needs: ["model:role"]
    }, function () {
        ember_mocha.it("has a validation type of \"user\"", function () {
            var model = this.subject();

            expect(model.get("validationType")).to.equal("user");
        });

        ember_mocha.it("active property is correct", function () {
            var model = this.subject({
                status: "active"
            });

            expect(model.get("active")).to.be.ok;

            ["warn-1", "warn-2", "warn-3", "warn-4", "locked"].forEach(function (status) {
                Ember['default'].run(function () {
                    model.set("status", status);

                    expect(model.get("status")).to.be.ok;
                });
            });

            Ember['default'].run(function () {
                model.set("status", "inactive");

                expect(model.get("active")).to.not.be.ok;
            });

            Ember['default'].run(function () {
                model.set("status", "invited");

                expect(model.get("active")).to.not.be.ok;
            });
        });

        ember_mocha.it("invited property is correct", function () {
            var model = this.subject({
                status: "invited"
            });

            expect(model.get("invited")).to.be.ok;

            Ember['default'].run(function () {
                model.set("status", "invited-pending");

                expect(model.get("invited")).to.be.ok;
            });

            Ember['default'].run(function () {
                model.set("status", "active");

                expect(model.get("invited")).to.not.be.ok;
            });

            Ember['default'].run(function () {
                model.set("status", "inactive");

                expect(model.get("invited")).to.not.be.ok;
            });
        });

        ember_mocha.it("pending property is correct", function () {
            var model = this.subject({
                status: "invited-pending"
            });

            expect(model.get("pending")).to.be.ok;

            Ember['default'].run(function () {
                model.set("status", "invited");

                expect(model.get("pending")).to.not.be.ok;
            });

            Ember['default'].run(function () {
                model.set("status", "inactive");

                expect(model.get("pending")).to.not.be.ok;
            });
        });

        ember_mocha.it("role property is correct", function () {
            var model, role;

            model = this.subject();

            Ember['default'].run(this, function () {
                role = this.store().createRecord("role", { name: "Author" });

                model.get("roles").pushObject(role);

                expect(model.get("role.name")).to.equal("Author");
            });

            Ember['default'].run(this, function () {
                role = this.store().createRecord("role", { name: "Editor" });

                model.set("role", role);

                expect(model.get("role.name")).to.equal("Editor");
            });
        });

        ember_mocha.it("isAuthor property is correct", function () {
            var model = this.subject();

            Ember['default'].run(this, function () {
                var role = this.store().createRecord("role", { name: "Author" });

                model.set("role", role);

                expect(model.get("isAuthor")).to.be.ok;
                expect(model.get("isEditor")).to.not.be.ok;
                expect(model.get("isAdmin")).to.not.be.ok;
                expect(model.get("isOwner")).to.not.be.ok;
            });
        });

        ember_mocha.it("isEditor property is correct", function () {
            var model = this.subject();

            Ember['default'].run(this, function () {
                var role = this.store().createRecord("role", { name: "Editor" });

                model.set("role", role);

                expect(model.get("isEditor")).to.be.ok;
                expect(model.get("isAuthor")).to.not.be.ok;
                expect(model.get("isAdmin")).to.not.be.ok;
                expect(model.get("isOwner")).to.not.be.ok;
            });
        });

        ember_mocha.it("isAdmin property is correct", function () {
            var model = this.subject();

            Ember['default'].run(this, function () {
                var role = this.store().createRecord("role", { name: "Administrator" });

                model.set("role", role);

                expect(model.get("isAdmin")).to.be.ok;
                expect(model.get("isAuthor")).to.not.be.ok;
                expect(model.get("isEditor")).to.not.be.ok;
                expect(model.get("isOwner")).to.not.be.ok;
            });
        });

        ember_mocha.it("isOwner property is correct", function () {
            var model = this.subject();

            Ember['default'].run(this, function () {
                var role = this.store().createRecord("role", { name: "Owner" });

                model.set("role", role);

                expect(model.get("isOwner")).to.be.ok;
                expect(model.get("isAuthor")).to.not.be.ok;
                expect(model.get("isAdmin")).to.not.be.ok;
                expect(model.get("isEditor")).to.not.be.ok;
            });
        });
    });

});
define('ghost/tests/unit/utils/ghost-paths_test', ['ghost/utils/ghost-paths'], function (ghostPaths) {

    'use strict';

    describe("ghost-paths", function () {
        describe("join", function () {
            var join = ghostPaths['default']().url.join;

            it("should join two or more paths, normalizing slashes", function () {
                var path;

                path = join("/one/", "/two/");
                expect(path).to.equal("/one/two/");

                path = join("/one", "/two/");
                expect(path).to.equal("/one/two/");

                path = join("/one/", "two/");
                expect(path).to.equal("/one/two/");

                path = join("/one/", "two/", "/three/");
                expect(path).to.equal("/one/two/three/");

                path = join("/one/", "two", "three/");
                expect(path).to.equal("/one/two/three/");
            });

            it("should not change the slash at the beginning", function () {
                var path;

                path = join("one/");
                expect(path).to.equal("one/");
                path = join("one/", "two");
                expect(path).to.equal("one/two/");
                path = join("/one/", "two");
                expect(path).to.equal("/one/two/");
                path = join("one/", "two", "three");
                expect(path).to.equal("one/two/three/");
                path = join("/one/", "two", "three");
                expect(path).to.equal("/one/two/three/");
            });

            it("should always return a slash at the end", function () {
                var path;

                path = join();
                expect(path).to.equal("/");
                path = join("");
                expect(path).to.equal("/");
                path = join("one");
                expect(path).to.equal("one/");
                path = join("one/");
                expect(path).to.equal("one/");
                path = join("one", "two");
                expect(path).to.equal("one/two/");
                path = join("one", "two/");
                expect(path).to.equal("one/two/");
            });
        });
    });

});
define('ghost/transforms/moment-date', ['exports', 'ember-data'], function (exports, DS) {

    'use strict';

    var MomentDate = DS['default'].Transform.extend({
        deserialize: function deserialize(serialized) {
            if (serialized) {
                return moment(serialized);
            }
            return serialized;
        },
        serialize: function serialize(deserialized) {
            if (deserialized) {
                return moment(deserialized).toDate();
            }
            return deserialized;
        }
    });
    exports['default'] = MomentDate;

});
define('ghost/utils/ajax', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    exports.getRequestErrorMessage = getRequestErrorMessage;

    var ajax = function ajax() {
        return ic.ajax.request.apply(null, arguments);
    };

    // Used in API request fail handlers to parse a standard api error
    // response json for the message to display
    function getRequestErrorMessage(request, performConcat) {
        var message, msgDetail;

        // Can't really continue without a request
        if (!request) {
            return null;
        }

        // Seems like a sensible default
        message = request.statusText;

        // If a non 200 response
        if (request.status !== 200) {
            try {
                // Try to parse out the error, or default to 'Unknown'
                if (request.responseJSON.errors && Ember['default'].isArray(request.responseJSON.errors)) {
                    message = request.responseJSON.errors.map(function (errorItem) {
                        return errorItem.message;
                    });
                } else {
                    message = request.responseJSON.error || "Unknown Error";
                }
            } catch (e) {
                msgDetail = request.status ? request.status + " - " + request.statusText : "Server was not available";
                message = "The server returned an error (" + msgDetail + ").";
            }
        }

        if (performConcat && Ember['default'].isArray(message)) {
            message = message.join("<br />");
        }

        // return an array of errors by default
        if (!performConcat && typeof message === "string") {
            message = [message];
        }

        return message;
    }

    exports['default'] = ajax;

    exports.ajax = ajax;

});
define('ghost/utils/bind', ['exports'], function (exports) {

    'use strict';

    var slice = Array.prototype.slice;

    function bind() {
        var args = slice.call(arguments),
            func = args.shift(),
            thisArg = args.pop();

        function bound() {
            return func.apply(thisArg, args);
        }

        return bound;
    }

    exports['default'] = bind;
    /* func, args, thisArg */

});
define('ghost/utils/bound-one-way', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var BoundOneWay = function BoundOneWay(upstream, transform) {
        if (typeof transform !== "function") {
            // default to the identity function
            transform = function (value) {
                return value;
            };
        }

        return Ember['default'].computed(upstream, function (key, value) {
            return arguments.length > 1 ? value : transform(this.get(upstream));
        });
    };

    exports['default'] = BoundOneWay;

});
define('ghost/utils/caja-sanitizers', ['exports'], function (exports) {

    'use strict';

    /**
     * google-caja uses url() and id() to verify if the values are allowed.
     */
    var url, id;

    /**
     * Check if URL is allowed
     * URLs are allowed if they start with http://, https://, or /.
     */
    url = function (url) {
        url = url.toString().replace(/['"]+/g, "");
        if (/^https?:\/\//.test(url) || /^\//.test(url)) {
            return url;
        }
    };

    /**
     * Check if ID is allowed
     * All ids are allowed at the moment.
     */
    id = function (id) {
        return id;
    };

    exports['default'] = {
        url: url,
        id: id
    };

});
define('ghost/utils/config-parser', ['exports'], function (exports) {

    'use strict';

    var isNumeric = function isNumeric(num) {
        return !isNaN(num);
    },
        _mapType = function _mapType(val) {
        if (val === "") {
            return null;
        } else if (val === "true") {
            return true;
        } else if (val === "false") {
            return false;
        } else if (isNumeric(val)) {
            return +val;
        } else if (val.indexOf("{") === 0) {
            try {
                return JSON.parse(val);
            } catch (e) {
                /*jshint unused:false */
                return val;
            }
        } else {
            return val;
        }
    },
        parseConfiguration = function parseConfiguration() {
        var metaConfigTags = $("meta[name^=\"env-\"]"),
            propertyName,
            config = {},
            value,
            key,
            i;

        for (i = 0; i < metaConfigTags.length; i += 1) {
            key = $(metaConfigTags[i]).prop("name");
            value = $(metaConfigTags[i]).prop("content");
            propertyName = key.substring(4); // produce config name ignoring the initial 'env-'.
            config[propertyName] = _mapType(value); // map string values to types if possible
        }
        return config;
    };

    exports['default'] = parseConfiguration;

});
define('ghost/utils/ctrl-or-cmd', ['exports'], function (exports) {

	'use strict';

	var ctrlOrCmd = navigator.userAgent.indexOf("Mac") !== -1 ? "command" : "ctrl";

	exports['default'] = ctrlOrCmd;

});
define('ghost/utils/date-formatting', ['exports'], function (exports) {

    'use strict';

    /* global moment */
    // jscs: disable disallowSpacesInsideParentheses

    var parseDateFormats, displayDateFormat, verifyTimeStamp, parseDateString, formatDate;

    parseDateFormats = ["DD MMM YY @ HH:mm", "DD MMM YY HH:mm", "D MMM YY @ HH:mm", "D MMM YY HH:mm", "DD MMM YYYY @ HH:mm", "DD MMM YYYY HH:mm", "D MMM YYYY @ HH:mm", "D MMM YYYY HH:mm", "DD/MM/YY @ HH:mm", "DD/MM/YY HH:mm", "DD/MM/YYYY @ HH:mm", "DD/MM/YYYY HH:mm", "DD-MM-YY @ HH:mm", "DD-MM-YY HH:mm", "DD-MM-YYYY @ HH:mm", "DD-MM-YYYY HH:mm", "YYYY-MM-DD @ HH:mm", "YYYY-MM-DD HH:mm", "DD MMM @ HH:mm", "DD MMM HH:mm", "D MMM @ HH:mm", "D MMM HH:mm"];

    displayDateFormat = "DD MMM YY @ HH:mm";

    // Add missing timestamps
    verifyTimeStamp = function (dateString) {
        if (dateString && !dateString.slice(-5).match(/\d+:\d\d/)) {
            dateString += " 12:00";
        }
        return dateString;
    };

    // Parses a string to a Moment
    parseDateString = function (value) {
        return value ? moment(verifyTimeStamp(value), parseDateFormats, true) : undefined;
    };

    // Formats a Date or Moment
    formatDate = function (value) {
        return verifyTimeStamp(value ? moment(value).format(displayDateFormat) : "");
    };

    exports.parseDateString = parseDateString;
    exports.formatDate = formatDate;

});
define('ghost/utils/document-title', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var documentTitle = function documentTitle() {
        Ember['default'].Route.reopen({
            // `titleToken` can either be a static string or a function
            // that accepts a model object and returns a string (or array
            // of strings if there are multiple tokens).
            titleToken: null,

            // `title` can either be a static string or a function
            // that accepts an array of tokens and returns a string
            // that will be the document title. The `collectTitleTokens` action
            // stops bubbling once a route is encountered that has a `title`
            // defined.
            title: null,

            _actions: {
                collectTitleTokens: function collectTitleTokens(tokens) {
                    var titleToken = this.titleToken,
                        finalTitle;

                    if (typeof this.titleToken === "function") {
                        titleToken = this.titleToken(this.currentModel);
                    }

                    if (Ember['default'].isArray(titleToken)) {
                        tokens.unshift.apply(this, titleToken);
                    } else if (titleToken) {
                        tokens.unshift(titleToken);
                    }

                    if (this.title) {
                        if (typeof this.title === "function") {
                            finalTitle = this.title(tokens);
                        } else {
                            finalTitle = this.title;
                        }

                        this.router.setTitle(finalTitle);
                    } else {
                        return true;
                    }
                }
            }
        });

        Ember['default'].Router.reopen({
            updateTitle: (function () {
                this.send("collectTitleTokens", []);
            }).on("didTransition"),

            setTitle: function setTitle(title) {
                if (Ember['default'].testing) {
                    this._title = title;
                } else {
                    window.document.title = title;
                }
            }
        });
    };

    exports['default'] = documentTitle;

});
define('ghost/utils/dropdown-service', ['exports', 'ember', 'ghost/mixins/body-event-listener'], function (exports, Ember, BodyEventListener) {

    'use strict';

    var DropdownService = Ember['default'].Object.extend(Ember['default'].Evented, BodyEventListener['default'], {
        bodyClick: function bodyClick(event) {
            /*jshint unused:false */
            this.closeDropdowns();
        },
        closeDropdowns: function closeDropdowns() {
            this.trigger("close");
        },
        toggleDropdown: function toggleDropdown(dropdownName, dropdownButton) {
            this.trigger("toggle", { target: dropdownName, button: dropdownButton });
        }
    });

    exports['default'] = DropdownService;

});
define('ghost/utils/ed-image-manager', ['exports'], function (exports) {

    'use strict';

    var imageMarkdownRegex = /^!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim;

    // Process the markdown content and find all of the locations where there is an image markdown block
    function parse(stringToParse) {
        var m,
            images = [];
        while ((m = imageMarkdownRegex.exec(stringToParse)) !== null) {
            images.push(m);
        }

        return images;
    }

    // Loop through all dropzones in the preview and find which one was the target of the upload
    function getZoneIndex(element) {
        var zones = document.querySelectorAll(".js-entry-preview .js-drop-zone"),
            i;

        for (i = 0; i < zones.length; i += 1) {
            if (zones.item(i) === element) {
                return i;
            }
        }

        return -1;
    }

    // Figure out the start and end of the selection range for the src in the markdown, so we know what to replace
    function getSrcRange(content, element) {
        var images = parse(content),
            index = getZoneIndex(element),
            replacement = {};

        if (index > -1) {
            // [1] matches the alt test, and 2 matches the url between the ()
            // if the () are missing entirely, which is valid, [2] will be undefined and we'll need to treat this case
            // a little differently
            if (images[index][2] === undefined) {
                replacement.needsParens = true;
                replacement.start = content.indexOf("]", images[index].index) + 1;
                replacement.end = replacement.start;
            } else {
                replacement.start = content.indexOf("(", images[index].index) + 1;
                replacement.end = replacement.start + images[index][2].length;
            }
            return replacement;
        }

        return false;
    }

    exports['default'] = {
        getSrcRange: getSrcRange
    };

});
define('ghost/utils/editor-shortcuts', ['exports', 'ghost/utils/ctrl-or-cmd'], function (exports, ctrlOrCmd) {

	'use strict';

	// # Editor shortcuts
	// Loaded by EditorBaseRoute, which is a shortcuts route
	// This map is used to ensure the right action is called by each shortcut
	var shortcuts = {};

	// General editor shortcuts
	shortcuts[ctrlOrCmd['default'] + "+alt+p"] = "publish";
	shortcuts["alt+shift+z"] = "toggleZenMode";

	// Markdown Shortcuts

	// Text
	shortcuts["ctrl+alt+u"] = { action: "editorShortcut", options: { type: "strike" } };
	shortcuts[ctrlOrCmd['default'] + "+b"] = { action: "editorShortcut", options: { type: "bold" } };
	shortcuts[ctrlOrCmd['default'] + "+i"] = { action: "editorShortcut", options: { type: "italic" } };

	shortcuts["ctrl+u"] = { action: "editorShortcut", options: { type: "uppercase" } };
	shortcuts["ctrl+shift+u"] = { action: "editorShortcut", options: { type: "lowercase" } };
	shortcuts["ctrl+alt+shift+u"] = { action: "editorShortcut", options: { type: "titlecase" } };
	shortcuts[ctrlOrCmd['default'] + "+shift+c"] = { action: "editorShortcut", options: { type: "copyHTML" } };
	shortcuts[ctrlOrCmd['default'] + "+h"] = { action: "editorShortcut", options: { type: "cycleHeaderLevel" } };

	// Formatting
	shortcuts["ctrl+q"] = { action: "editorShortcut", options: { type: "blockquote" } };
	shortcuts["ctrl+l"] = { action: "editorShortcut", options: { type: "list" } };

	// Insert content
	shortcuts["ctrl+shift+1"] = { action: "editorShortcut", options: { type: "currentDate" } };
	shortcuts[ctrlOrCmd['default'] + "+k"] = { action: "editorShortcut", options: { type: "link" } };
	shortcuts[ctrlOrCmd['default'] + "+shift+i"] = { action: "editorShortcut", options: { type: "image" } };
	shortcuts[ctrlOrCmd['default'] + "+shift+k"] = { action: "editorShortcut", options: { type: "code" } };

	exports['default'] = shortcuts;

});
define('ghost/utils/ghost-paths', ['exports'], function (exports) {

    'use strict';

    var makeRoute = function makeRoute(root, args) {
        var slashAtStart, slashAtEnd, parts, route;

        slashAtStart = /^\//;
        slashAtEnd = /\/$/;
        route = root.replace(slashAtEnd, "");
        parts = Array.prototype.slice.call(args, 0);

        parts.forEach(function (part) {
            if (part) {
                route = [route, part.replace(slashAtStart, "").replace(slashAtEnd, "")].join("/");
            }
        });
        return route += "/";
    };

    function ghostPaths() {
        var path = window.location.pathname,
            subdir = path.substr(0, path.search("/ghost/")),
            adminRoot = subdir + "/ghost",
            apiRoot = subdir + "/ghost/api/v0.1";

        function assetUrl(src) {
            return subdir + src;
        }

        return {
            subdir: subdir,
            blogRoot: subdir + "/",
            adminRoot: adminRoot,
            apiRoot: apiRoot,

            url: {
                admin: function admin() {
                    return makeRoute(adminRoot, arguments);
                },

                api: function api() {
                    return makeRoute(apiRoot, arguments);
                },

                join: function join() {
                    if (arguments.length > 1) {
                        return makeRoute(arguments[0], Array.prototype.slice.call(arguments, 1));
                    } else if (arguments.length === 1) {
                        var arg = arguments[0];
                        return arg.slice(-1) === "/" ? arg : arg + "/";
                    }
                    return "/";
                },

                asset: assetUrl
            }
        };
    }

    exports['default'] = ghostPaths;

});
define('ghost/utils/isFinite', ['exports'], function (exports) {

    'use strict';

    /* globals window */

    // isFinite function from lodash

    function isFinite(value) {
        return window.isFinite(value) && !window.isNaN(parseFloat(value));
    }

    exports['default'] = isFinite;

});
define('ghost/utils/isNumber', ['exports'], function (exports) {

  'use strict';

  // isNumber function from lodash

  var toString = Object.prototype.toString;

  function isNumber(value) {
    return typeof value === "number" || value && typeof value === "object" && toString.call(value) === "[object Number]" || false;
  }

  exports['default'] = isNumber;

});
define('ghost/utils/link-view', ['ember'], function (Ember) {

    'use strict';

    Ember['default'].LinkView.reopen({
        active: Ember['default'].computed("loadedParams", "resolvedParams", "routeArgs", function () {
            var isActive = this._super();

            Ember['default'].set(this, "alternateActive", isActive);

            return isActive;
        }),

        activeClass: Ember['default'].computed("tagName", function () {
            return this.get("tagName") === "button" ? "" : "active";
        })
    });

});
define('ghost/utils/mobile', ['exports'], function (exports) {

	'use strict';

	var mobileQuery = matchMedia("(max-width: 900px)");

	exports['default'] = mobileQuery;

});
define('ghost/utils/notifications', ['exports', 'ember', 'ghost/models/notification'], function (exports, Ember, Notification) {

    'use strict';

    var Notifications = Ember['default'].ArrayProxy.extend({
        delayedNotifications: [],
        content: Ember['default'].A(),
        timeout: 3000,

        pushObject: function pushObject(object) {
            // object can be either a DS.Model or a plain JS object, so when working with
            // it, we need to handle both cases.

            // make sure notifications have all the necessary properties set.
            if (typeof object.toJSON === "function") {
                // working with a DS.Model

                if (object.get("location") === "") {
                    object.set("location", "bottom");
                }
            } else {
                if (!object.location) {
                    object.location = "bottom";
                }
            }

            this._super(object);
        },
        handleNotification: function handleNotification(message, delayed) {
            if (typeof message.toJSON === "function") {
                // If this is a persistent message from the server, treat it as html safe
                if (message.get("status") === "persistent") {
                    message.set("message", message.get("message").htmlSafe());
                }

                if (!message.get("status")) {
                    message.set("status", "passive");
                }
            } else {
                if (!message.status) {
                    message.status = "passive";
                }
            }

            if (!delayed) {
                this.pushObject(message);
            } else {
                this.delayedNotifications.push(message);
            }
        },
        showError: function showError(message, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            this.handleNotification({
                type: "error",
                message: message
            }, options.delayed);
        },
        showErrors: function showErrors(errors, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            for (var i = 0; i < errors.length; i += 1) {
                this.showError(errors[i].message || errors[i], { doNotClosePassive: true });
            }
        },
        showAPIError: function showAPIError(resp, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            options.defaultErrorText = options.defaultErrorText || "There was a problem on the server, please try again.";

            if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.error) {
                this.showError(resp.jqXHR.responseJSON.error, options);
            } else if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
                this.showErrors(resp.jqXHR.responseJSON.errors, options);
            } else if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.message) {
                this.showError(resp.jqXHR.responseJSON.message, options);
            } else {
                this.showError(options.defaultErrorText, { doNotClosePassive: true });
            }
        },
        showInfo: function showInfo(message, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            this.handleNotification({
                type: "info",
                message: message
            }, options.delayed);
        },
        showSuccess: function showSuccess(message, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            this.handleNotification({
                type: "success",
                message: message
            }, options.delayed);
        },
        showWarn: function showWarn(message, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            this.handleNotification({
                type: "warn",
                message: message
            }, options.delayed);
        },
        displayDelayed: function displayDelayed() {
            var self = this;

            self.delayedNotifications.forEach(function (message) {
                self.pushObject(message);
            });
            self.delayedNotifications = [];
        },
        closeNotification: function closeNotification(notification) {
            var self = this;

            if (notification instanceof Notification['default']) {
                notification.deleteRecord();
                notification.save()["finally"](function () {
                    self.removeObject(notification);
                });
            } else {
                this.removeObject(notification);
            }
        },
        closePassive: function closePassive() {
            this.set("content", this.rejectBy("status", "passive"));
        },
        closePersistent: function closePersistent() {
            this.set("content", this.rejectBy("status", "persistent"));
        },
        closeAll: function closeAll() {
            this.clear();
        }
    });

    exports['default'] = Notifications;

});
define('ghost/utils/random-password', ['exports'], function (exports) {

    'use strict';

    /* global generatePassword */

    function randomPassword() {
        var word = generatePassword(6),
            randomN = Math.floor(Math.random() * 1000);

        return word + randomN;
    }

    exports['default'] = randomPassword;

});
define('ghost/utils/set-scroll-classname', ['exports'], function (exports) {

    'use strict';

    // ## scrollShadow
    // This adds a 'scroll' class to the targeted element when the element is scrolled
    // `this` is expected to be a jQuery-wrapped element
    // **target:** The element in which the class is applied. Defaults to scrolled element.
    // **class-name:** The class which is applied.
    // **offset:** How far the user has to scroll before the class is applied.
    var setScrollClassName = function setScrollClassName(options) {
        var $target = options.target || this,
            offset = options.offset,
            className = options.className || "scrolling";

        if (this.scrollTop() > offset) {
            $target.addClass(className);
        } else {
            $target.removeClass(className);
        }
    };

    exports['default'] = setScrollClassName;

});
define('ghost/utils/text-field', ['ember'], function (Ember) {

    'use strict';

    Ember['default'].TextField.reopen({
        attributeBindings: ["autofocus"]
    });

});
define('ghost/utils/titleize', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var lowerWords = ["of", "a", "the", "and", "an", "or", "nor", "but", "is", "if", "then", "else", "when", "at", "from", "by", "on", "off", "for", "in", "out", "over", "to", "into", "with"];

    function titleize(input) {
        var words = input.split(" ").map(function (word, index) {
            if (index === 0 || lowerWords.indexOf(word) === -1) {
                word = Ember['default'].String.capitalize(word);
            }

            return word;
        });

        return words.join(" ");
    }

    exports['default'] = titleize;

});
define('ghost/utils/validator-extensions', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    function init() {
        // Provide a few custom validators
        //
        validator.extend("empty", function (str) {
            return Ember['default'].isBlank(str);
        });

        validator.extend("notContains", function (str, badString) {
            return str.indexOf(badString) === -1;
        });
    }

    exports['default'] = {
        init: init
    };

});
define('ghost/utils/word-count', ['exports'], function (exports) {

    'use strict';

    // jscs: disable
    /* global XRegExp */

    function wordCount(s) {

        var nonANumLetters = new XRegExp("[^\\s\\d\\p{L}]", "g"); // all non-alphanumeric letters regexp

        s = s.replace(/<(.|\n)*?>/g, " "); // strip tags
        s = s.replace(nonANumLetters, ""); // ignore non-alphanumeric letters
        s = s.replace(/(^\s*)|(\s*$)/gi, ""); // exclude starting and ending white-space
        s = s.replace(/\n /gi, " "); // convert newlines to spaces
        s = s.replace(/\n+/gi, " ");
        s = s.replace(/[ ]{2,}/gi, " "); // convert 2 or more spaces to 1

        return s.split(" ").length;
    }

    exports['default'] = wordCount;

});
define('ghost/validators/forgotten', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var ForgotValidator = Ember['default'].Object.create({
        check: function check(model) {
            var data = model.getProperties("email"),
                validationErrors = [];

            if (!validator.isEmail(data.email)) {
                validationErrors.push({
                    message: "Invalid email address"
                });
            }

            return validationErrors;
        }
    });

    exports['default'] = ForgotValidator;

});
define('ghost/validators/new-user', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var NewUserValidator = Ember['default'].Object.extend({
        check: function check(model) {
            var data = model.getProperties("name", "email", "password"),
                validationErrors = [];

            if (!validator.isLength(data.name, 1)) {
                validationErrors.push({
                    message: "Please enter a name."
                });
            }

            if (!validator.isEmail(data.email)) {
                validationErrors.push({
                    message: "Invalid Email."
                });
            }

            if (!validator.isLength(data.password, 8)) {
                validationErrors.push({
                    message: "Password must be at least 8 characters long."
                });
            }

            return validationErrors;
        }
    });

    exports['default'] = NewUserValidator;

});
define('ghost/validators/post', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var PostValidator = Ember['default'].Object.create({
        check: function check(model) {
            var validationErrors = [],
                data = model.getProperties("title", "meta_title", "meta_description");

            if (validator.empty(data.title)) {
                validationErrors.push({
                    message: "You must specify a title for the post."
                });
            }

            if (!validator.isLength(data.meta_title, 0, 150)) {
                validationErrors.push({
                    message: "Meta Title cannot be longer than 150 characters."
                });
            }

            if (!validator.isLength(data.meta_description, 0, 200)) {
                validationErrors.push({
                    message: "Meta Description cannot be longer than 200 characters."
                });
            }

            return validationErrors;
        }
    });

    exports['default'] = PostValidator;

});
define('ghost/validators/reset', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var ResetValidator = Ember['default'].Object.create({
        check: function check(model) {
            var p1 = model.get("newPassword"),
                p2 = model.get("ne2Password"),
                validationErrors = [];

            if (!validator.equals(p1, p2)) {
                validationErrors.push({
                    message: "The two new passwords don't match."
                });
            }

            if (!validator.isLength(p1, 8)) {
                validationErrors.push({
                    message: "The password is not long enough."
                });
            }
            return validationErrors;
        }
    });

    exports['default'] = ResetValidator;

});
define('ghost/validators/setting', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SettingValidator = Ember['default'].Object.create({
        check: function check(model) {
            var validationErrors = [],
                title = model.get("title"),
                description = model.get("description"),
                email = model.get("email"),
                postsPerPage = model.get("postsPerPage"),
                isPrivate = model.get("isPrivate"),
                password = model.get("password");

            if (!validator.isLength(title, 0, 150)) {
                validationErrors.push({ message: "Title is too long" });
            }

            if (!validator.isLength(description, 0, 200)) {
                validationErrors.push({ message: "Description is too long" });
            }

            if (!validator.isEmail(email) || !validator.isLength(email, 0, 254)) {
                validationErrors.push({ message: "Supply a valid email address" });
            }

            if (isPrivate && password === "") {
                validationErrors.push({ message: "Password must be supplied" });
            }

            if (postsPerPage > 1000) {
                validationErrors.push({ message: "The maximum number of posts per page is 1000" });
            }

            if (postsPerPage < 1) {
                validationErrors.push({ message: "The minimum number of posts per page is 1" });
            }

            if (!validator.isInt(postsPerPage)) {
                validationErrors.push({ message: "Posts per page must be a number" });
            }

            return validationErrors;
        }
    });

    exports['default'] = SettingValidator;

});
define('ghost/validators/setup', ['exports', 'ghost/validators/new-user'], function (exports, NewUserValidator) {

    'use strict';

    var SetupValidator = NewUserValidator['default'].extend({
        check: function check(model) {
            var data = model.getProperties("blogTitle"),
                validationErrors = this._super(model);

            if (!validator.isLength(data.blogTitle, 1)) {
                validationErrors.push({
                    message: "Please enter a blog title."
                });
            }

            return validationErrors;
        }
    }).create();

    exports['default'] = SetupValidator;

});
define('ghost/validators/signin', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SigninValidator = Ember['default'].Object.create({
        check: function check(model) {
            var data = model.getProperties("identification", "password"),
                validationErrors = [];

            if (!validator.isEmail(data.identification)) {
                validationErrors.push("Invalid Email");
            }

            if (!validator.isLength(data.password || "", 1)) {
                validationErrors.push("Please enter a password");
            }

            return validationErrors;
        }
    });

    exports['default'] = SigninValidator;

});
define('ghost/validators/signup', ['exports', 'ghost/validators/new-user'], function (exports, NewUserValidator) {

	'use strict';

	exports['default'] = NewUserValidator['default'].create();

});
define('ghost/validators/tag-settings', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var TagSettingsValidator = Ember['default'].Object.create({
        check: function check(model) {
            var validationErrors = [],
                data = model.getProperties("name", "meta_title", "meta_description");

            if (validator.empty(data.name)) {
                validationErrors.push({
                    message: "You must specify a name for the tag."
                });
            }

            if (!validator.isLength(data.meta_title, 0, 150)) {
                validationErrors.push({
                    message: "Meta Title cannot be longer than 150 characters."
                });
            }

            if (!validator.isLength(data.meta_description, 0, 200)) {
                validationErrors.push({
                    message: "Meta Description cannot be longer than 200 characters."
                });
            }

            return validationErrors;
        }
    });

    exports['default'] = TagSettingsValidator;

});
define('ghost/validators/user', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var UserValidator = Ember['default'].Object.create({
        check: function check(model) {
            var validator = this.validators[model.get("status")];

            if (typeof validator !== "function") {
                return [];
            }

            return validator(model);
        },

        validators: {
            invited: function invited(model) {
                var validationErrors = [],
                    email = model.get("email"),
                    roles = model.get("roles");

                if (!validator.isEmail(email)) {
                    validationErrors.push({ message: "Please supply a valid email address" });
                }

                if (roles.length < 1) {
                    validationErrors.push({ message: "Please select a role" });
                }

                return validationErrors;
            },

            active: function active(model) {
                var validationErrors = [],
                    name = model.get("name"),
                    bio = model.get("bio"),
                    email = model.get("email"),
                    location = model.get("location"),
                    website = model.get("website");

                if (!validator.isLength(name, 0, 150)) {
                    validationErrors.push({ message: "Name is too long" });
                }

                if (!validator.isLength(bio, 0, 200)) {
                    validationErrors.push({ message: "Bio is too long" });
                }

                if (!validator.isEmail(email)) {
                    validationErrors.push({ message: "Please supply a valid email address" });
                }

                if (!validator.isLength(location, 0, 150)) {
                    validationErrors.push({ message: "Location is too long" });
                }

                if (!Ember['default'].isEmpty(website) && (!validator.isURL(website, { require_protocol: false }) || !validator.isLength(website, 0, 2000))) {
                    validationErrors.push({ message: "Website is not a valid url" });
                }

                return validationErrors;
            }
        }
    });

    exports['default'] = UserValidator;

});
define('ghost/views/application', ['exports', 'ember', 'ghost/utils/mobile'], function (exports, Ember, mobileQuery) {

    'use strict';

    var ApplicationView = Ember['default'].View.extend({
        elementId: "container",

        didInsertElement: function didInsertElement() {
            // #### Navigating within the sidebar closes it.
            var self = this;

            $("body").on("click tap", ".js-nav-item", function () {
                Ember['default'].run(function () {
                    if (mobileQuery['default'].matches) {
                        self.set("controller.showGlobalMobileNav", false);
                    }
                });
            });

            // #### Close the nav if mobile and clicking outside of the nav or not the burger toggle
            $(".js-nav-cover").on("click tap", function () {
                Ember['default'].run(function () {
                    var isOpen = self.get("controller.showGlobalMobileNav");

                    if (isOpen) {
                        self.set("controller.showGlobalMobileNav", false);
                    }
                });
            });

            function swapUserMenuDropdownTriangleClasses(mq) {
                if (mq.matches) {
                    $(".js-user-menu-dropdown-menu").removeClass("dropdown-triangle-top-right ").addClass("dropdown-triangle-bottom");
                } else {
                    $(".js-user-menu-dropdown-menu").removeClass("dropdown-triangle-bottom").addClass("dropdown-triangle-top-right");
                }
            }

            // #### Listen to the viewport and change user-menu dropdown triangle classes accordingly
            this.set("swapUserMenuDropdownTriangleClasses", Ember['default'].run.bind(this, swapUserMenuDropdownTriangleClasses));

            mobileQuery['default'].addListener(this.get("swapUserMenuDropdownTriangleClasses"));
            swapUserMenuDropdownTriangleClasses(mobileQuery['default']);

            this.set("closeGlobalMobileNavOnDesktop", Ember['default'].run.bind(this, function closeGlobalMobileNavOnDesktop(mq) {
                if (!mq.matches) {
                    // Is desktop sized
                    this.set("controller.showGlobalMobileNav", false);
                }
            }));

            mobileQuery['default'].addListener(this.get("closeGlobalMobileNavOnDesktop"));
        },

        showGlobalMobileNavObserver: (function () {
            if (this.get("controller.showGlobalMobileNav")) {
                $("body").addClass("global-nav-expanded");
            } else {
                $("body").removeClass("global-nav-expanded");
            }
        }).observes("controller.showGlobalMobileNav"),

        willDestroyElement: function willDestroyElement() {
            mobileQuery['default'].removeListener(this.get("closeGlobalMobileNavOnDesktop"));
            mobileQuery['default'].removeListener(this.get("swapUserMenuDropdownTriangleClasses"));
        },

        toggleSettingsMenuBodyClass: (function () {
            $("body").toggleClass("settings-menu-expanded", this.get("controller.showSettingsMenu"));
        }).observes("controller.showSettingsMenu")
    });

    exports['default'] = ApplicationView;

});
define('ghost/views/content-preview-content-view', ['exports', 'ember', 'ghost/utils/set-scroll-classname'], function (exports, Ember, setScrollClassName) {

    'use strict';

    var PostContentView = Ember['default'].View.extend({
        classNames: ["content-preview-content"],

        didInsertElement: function didInsertElement() {
            var el = this.$();
            el.on("scroll", Ember['default'].run.bind(el, setScrollClassName['default'], {
                target: el.closest(".content-preview"),
                offset: 10
            }));
        },

        contentObserver: (function () {
            var el = this.$();

            if (el) {
                el.closest(".content-preview").scrollTop(0);
            }
        }).observes("controller.content"),

        willDestroyElement: function willDestroyElement() {
            var el = this.$();
            el.off("scroll");
        }
    });

    exports['default'] = PostContentView;

});
define('ghost/views/editor-save-button', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var EditorSaveButtonView = Ember['default'].View.extend({
        templateName: "editor-save-button",
        tagName: "section",
        classNames: ["splitbtn", "js-publish-splitbutton"],

        // Tracks whether we're going to change the state of the post on save
        isDangerous: Ember['default'].computed("controller.model.isPublished", "controller.willPublish", function () {
            return this.get("controller.model.isPublished") !== this.get("controller.willPublish");
        }),

        publishText: Ember['default'].computed("controller.model.isPublished", "controller.postOrPage", function () {
            return this.get("controller.model.isPublished") ? "Update " + this.get("controller.postOrPage") : "Publish Now";
        }),

        draftText: Ember['default'].computed("controller.model.isPublished", function () {
            return this.get("controller.model.isPublished") ? "Unpublish" : "Save Draft";
        }),

        deleteText: Ember['default'].computed("controller.postOrPage", function () {
            return "Delete " + this.get("controller.postOrPage");
        }),

        saveText: Ember['default'].computed("controller.willPublish", "publishText", "draftText", function () {
            return this.get("controller.willPublish") ? this.get("publishText") : this.get("draftText");
        })
    });

    exports['default'] = EditorSaveButtonView;

});
define('ghost/views/editor/edit', ['exports', 'ember', 'ghost/mixins/editor-base-view'], function (exports, Ember, EditorViewMixin) {

    'use strict';

    var EditorView = Ember['default'].View.extend(EditorViewMixin['default'], {
        tagName: "section",
        classNames: ["entry-container"]
    });

    exports['default'] = EditorView;

});
define('ghost/views/editor/new', ['exports', 'ember', 'ghost/mixins/editor-base-view'], function (exports, Ember, EditorViewMixin) {

    'use strict';

    var EditorNewView = Ember['default'].View.extend(EditorViewMixin['default'], {
        tagName: "section",
        templateName: "editor/edit",
        classNames: ["entry-container"]
    });

    exports['default'] = EditorNewView;

});
define('ghost/views/mobile/content-view', ['exports', 'ember', 'ghost/utils/mobile'], function (exports, Ember, mobileQuery) {

    'use strict';

    var MobileContentView = Ember['default'].View.extend({
        // Ensure that loading this view brings it into view on mobile
        showContent: (function () {
            if (mobileQuery['default'].matches) {
                this.get("parentView").showContent();
            }
        }).on("didInsertElement")
    });

    exports['default'] = MobileContentView;

});
define('ghost/views/mobile/index-view', ['exports', 'ember', 'ghost/utils/mobile'], function (exports, Ember, mobileQuery) {

    'use strict';

    var MobileIndexView = Ember['default'].View.extend({
        // Ensure that going to the index brings the menu into view on mobile.
        showMenu: (function () {
            if (mobileQuery['default'].matches) {
                this.get("parentView").showMenu();
            }
        }).on("didInsertElement")
    });

    exports['default'] = MobileIndexView;

});
define('ghost/views/mobile/parent-view', ['exports', 'ember', 'ghost/utils/mobile'], function (exports, Ember, mobileQuery) {

    'use strict';

    var MobileParentView = Ember['default'].View.extend({
        showContent: Ember['default'].K,
        showMenu: Ember['default'].K,
        showAll: Ember['default'].K,

        setChangeLayout: (function () {
            var self = this;
            this.set("changeLayout", function changeLayout() {
                if (mobileQuery['default'].matches) {
                    // transitioned to mobile layout, so show content
                    self.showContent();
                } else {
                    // went from mobile to desktop
                    self.showAll();
                }
            });
        }).on("init"),

        attachChangeLayout: (function () {
            mobileQuery['default'].addListener(this.changeLayout);
        }).on("didInsertElement"),

        detachChangeLayout: (function () {
            mobileQuery['default'].removeListener(this.changeLayout);
        }).on("willDestroyElement")
    });

    exports['default'] = MobileParentView;

});
define('ghost/views/paginated-scroll-box', ['exports', 'ember', 'ghost/utils/set-scroll-classname', 'ghost/mixins/pagination-view-infinite-scroll'], function (exports, Ember, setScrollClassName, PaginationViewMixin) {

    'use strict';

    var PaginatedScrollBox = Ember['default'].View.extend(PaginationViewMixin['default'], {
        attachScrollClassHandler: (function () {
            var el = this.$();
            el.on("scroll", Ember['default'].run.bind(el, setScrollClassName['default'], {
                target: el.closest(".content-list"),
                offset: 10
            }));
        }).on("didInsertElement"),

        detachScrollClassHandler: (function () {
            this.$().off("scroll");
        }).on("willDestroyElement")
    });

    exports['default'] = PaginatedScrollBox;

});
define('ghost/views/post-item-view', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var PostItemView = Ember['default'].View.extend({
        classNameBindings: ["active", "isFeatured:featured", "isPage:page"],

        active: null,

        isFeatured: Ember['default'].computed.alias("controller.model.featured"),

        isPage: Ember['default'].computed.alias("controller.model.page"),

        doubleClick: function doubleClick() {
            this.get("controller").send("openEditor");
        },

        click: function click() {
            this.get("controller").send("showPostContent");
        },
        scrollIntoView: function scrollIntoView() {
            if (!this.get("active")) {
                return;
            }
            var element = this.$(),
                offset = element.offset().top,
                elementHeight = element.height(),
                container = Ember['default'].$(".js-content-scrollbox"),
                containerHeight = container.height(),
                currentScroll = container.scrollTop(),
                isBelowTop,
                isAboveBottom,
                isOnScreen;

            isAboveBottom = offset < containerHeight;
            isBelowTop = offset > elementHeight;

            isOnScreen = isBelowTop && isAboveBottom;

            if (!isOnScreen) {
                // Scroll so that element is centered in container
                // 40 is the amount of padding on the container
                container.clearQueue().animate({
                    scrollTop: currentScroll + offset - 40 - containerHeight / 2
                });
            }
        },
        removeScrollBehaviour: (function () {
            this.removeObserver("active", this, this.scrollIntoView);
        }).on("willDestroyElement"),
        addScrollBehaviour: (function () {
            this.addObserver("active", this, this.scrollIntoView);
        }).on("didInsertElement")
    });

    exports['default'] = PostItemView;

});
define('ghost/views/post-tags-input', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var PostTagsInputView = Ember['default'].View.extend({
        tagName: "section",
        elementId: "entry-tags",
        classNames: "publish-bar-inner",
        classNameBindings: ["hasFocus:focused"],

        hasFocus: false,

        keys: {
            BACKSPACE: 8,
            TAB: 9,
            ENTER: 13,
            ESCAPE: 27,
            UP: 38,
            DOWN: 40,
            NUMPAD_ENTER: 108
        },

        didInsertElement: function didInsertElement() {
            this.get("controller").send("loadAllTags");
        },

        willDestroyElement: function willDestroyElement() {
            this.get("controller").send("reset");
        },

        overlayStyles: Ember['default'].computed("hasFocus", "controller.suggestions.length", function () {
            var styles = [],
                leftPos;

            if (this.get("hasFocus") && this.get("controller.suggestions.length")) {
                leftPos = this.$().find("#tags").position().left;
                styles.push("display: block");
                styles.push("left: " + leftPos + "px");
            } else {
                styles.push("display: none");
                styles.push("left", 0);
            }

            return styles.join(";").htmlSafe();
        }),

        tagInputView: Ember['default'].TextField.extend({
            focusIn: function focusIn() {
                this.get("parentView").set("hasFocus", true);
            },

            focusOut: function focusOut() {
                this.get("parentView").set("hasFocus", false);
            },

            keyPress: function keyPress(event) {
                // listen to keypress event to handle comma key on international keyboard
                var controller = this.get("parentView.controller"),
                    isComma = ",".localeCompare(String.fromCharCode(event.keyCode || event.charCode)) === 0;

                // use localeCompare in case of international keyboard layout
                if (isComma) {
                    event.preventDefault();

                    if (controller.get("selectedSuggestion")) {
                        controller.send("addSelectedSuggestion");
                    } else {
                        controller.send("addNewTag");
                    }
                }
            },

            keyDown: function keyDown(event) {
                var controller = this.get("parentView.controller"),
                    keys = this.get("parentView.keys"),
                    hasValue;

                switch (event.keyCode) {
                    case keys.UP:
                        event.preventDefault();
                        controller.send("selectPreviousSuggestion");
                        break;

                    case keys.DOWN:
                        event.preventDefault();
                        controller.send("selectNextSuggestion");
                        break;

                    case keys.TAB:
                    case keys.ENTER:
                    case keys.NUMPAD_ENTER:
                        if (controller.get("selectedSuggestion")) {
                            event.preventDefault();
                            controller.send("addSelectedSuggestion");
                        } else {
                            // allow user to tab out of field if input is empty
                            hasValue = !Ember['default'].isEmpty(this.get("value"));
                            if (hasValue || event.keyCode !== keys.TAB) {
                                event.preventDefault();
                                controller.send("addNewTag");
                            }
                        }
                        break;

                    case keys.BACKSPACE:
                        if (Ember['default'].isEmpty(this.get("value"))) {
                            event.preventDefault();
                            controller.send("deleteLastTag");
                        }
                        break;

                    case keys.ESCAPE:
                        event.preventDefault();
                        controller.send("reset");
                        break;
                }
            }
        }),

        suggestionView: Ember['default'].View.extend({
            tagName: "li",
            classNameBindings: "suggestion.selected",

            suggestion: null,

            // we can't use the 'click' event here as the focusOut event on the
            // input will fire first

            mouseDown: function mouseDown(event) {
                event.preventDefault();
            },

            mouseUp: function mouseUp(event) {
                event.preventDefault();
                this.get("parentView.controller").send("addTag", this.get("suggestion.tag"));
            }
        }),

        actions: {
            deleteTag: function deleteTag(tag) {
                // The view wants to keep focus on the input after a click on a tag
                Ember['default'].$(".js-tag-input").focus();
                // Make the controller do the actual work
                this.get("controller").send("deleteTag", tag);
            }
        }
    });

    exports['default'] = PostTagsInputView;

});
define('ghost/views/posts', ['exports', 'ghost/views/mobile/parent-view'], function (exports, MobileParentView) {

    'use strict';

    var PostsView = MobileParentView['default'].extend({
        classNames: ["content-view-container"],
        tagName: "section",

        // Mobile parent view callbacks
        showMenu: function showMenu() {
            $(".js-content-list, .js-content-preview").addClass("show-menu").removeClass("show-content");
        },
        showContent: function showContent() {
            $(".js-content-list, .js-content-preview").addClass("show-content").removeClass("show-menu");
        },
        showAll: function showAll() {
            $(".js-content-list, .js-content-preview").removeClass("show-menu show-content");
        }
    });

    exports['default'] = PostsView;

});
define('ghost/views/posts/index', ['exports', 'ghost/views/mobile/index-view'], function (exports, MobileIndexView) {

    'use strict';

    var PostsIndexView = MobileIndexView['default'].extend({
        classNames: ["no-posts-box"]
    });

    exports['default'] = PostsIndexView;

});
define('ghost/views/posts/post', ['exports', 'ghost/views/mobile/content-view'], function (exports, MobileContentView) {

	'use strict';

	var PostsPostView = MobileContentView['default'].extend();

	exports['default'] = PostsPostView;

});
define('ghost/views/settings', ['exports', 'ghost/views/mobile/parent-view'], function (exports, MobileParentView) {

    'use strict';

    var SettingsView = MobileParentView['default'].extend({
        // MobileParentView callbacks
        showMenu: function showMenu() {
            $(".js-settings-header-inner").css("display", "none");
            $(".js-settings-menu").css({ right: "0", left: "0", "margin-right": "0" });
            $(".js-settings-content").css({ right: "-100%", left: "100%", "margin-left": "15" });
        },
        showContent: function showContent() {
            $(".js-settings-menu").css({ right: "100%", left: "-110%", "margin-right": "15px" });
            $(".js-settings-content").css({ right: "0", left: "0", "margin-left": "0" });
            $(".js-settings-header-inner").css("display", "block");
        },
        showAll: function showAll() {
            $(".js-settings-menu, .js-settings-content").removeAttr("style");
        }
    });

    exports['default'] = SettingsView;

});
define('ghost/views/settings/about', ['exports', 'ghost/views/settings/content-base'], function (exports, BaseView) {

	'use strict';

	var SettingsAboutView = BaseView['default'].extend();

	exports['default'] = SettingsAboutView;

});
define('ghost/views/settings/apps', ['exports', 'ghost/views/settings/content-base'], function (exports, BaseView) {

	'use strict';

	var SettingsAppsView = BaseView['default'].extend();

	exports['default'] = SettingsAppsView;

});
define('ghost/views/settings/code-injection', ['exports', 'ghost/views/settings/content-base'], function (exports, BaseView) {

	'use strict';

	var SettingsGeneralView = BaseView['default'].extend();

	exports['default'] = SettingsGeneralView;

});
define('ghost/views/settings/content-base', ['exports', 'ghost/views/mobile/content-view'], function (exports, MobileContentView) {

  'use strict';

  var SettingsContentBaseView = MobileContentView['default'].extend({
    tagName: "section",
    classNames: ["settings-content", "js-settings-content", "fade-in"]
  });

  exports['default'] = SettingsContentBaseView;

});
define('ghost/views/settings/general', ['exports', 'ghost/views/settings/content-base'], function (exports, BaseView) {

	'use strict';

	var SettingsGeneralView = BaseView['default'].extend();

	exports['default'] = SettingsGeneralView;

});
define('ghost/views/settings/index', ['exports', 'ghost/views/mobile/index-view'], function (exports, MobileIndexView) {

	'use strict';

	var SettingsIndexView = MobileIndexView['default'].extend();

	exports['default'] = SettingsIndexView;

});
define('ghost/views/settings/labs', ['exports', 'ghost/views/settings/content-base'], function (exports, BaseView) {

	'use strict';

	var SettingsLabsView = BaseView['default'].extend();

	exports['default'] = SettingsLabsView;

});
define('ghost/views/settings/navigation', ['exports', 'ember', 'ghost/views/settings/content-base'], function (exports, Ember, BaseView) {

    'use strict';

    var SettingsNavigationView = BaseView['default'].extend({

        didInsertElement: function didInsertElement() {
            var navContainer = Ember['default'].$(".js-settings-navigation"),
                navElements = ".navigation-item:not(.navigation-item:last-child)",
                self = this;

            navContainer.sortable({
                handle: ".navigation-item-drag-handle",
                items: navElements,

                start: function start(event, ui) {
                    Ember['default'].run(function () {
                        ui.item.data("start-index", ui.item.index());
                    });
                },

                update: function update(event, ui) {
                    Ember['default'].run(function () {
                        self.get("controller").send("moveItem", ui.item.data("start-index"), ui.item.index());
                        ui.item.remove();
                    });
                }
            });
        },

        willDestroyElement: function willDestroyElement() {
            Ember['default'].$(".js-settings-navigation").sortable("destroy");
        }

    });

    exports['default'] = SettingsNavigationView;

});
define('ghost/views/settings/pass-protect', ['exports', 'ghost/views/settings/content-base'], function (exports, BaseView) {

	'use strict';

	var SettingsGeneralView = BaseView['default'].extend();

	exports['default'] = SettingsGeneralView;

});
define('ghost/views/settings/tags', ['exports', 'ghost/views/settings/content-base', 'ghost/mixins/pagination-view-infinite-scroll'], function (exports, BaseView, PaginationScrollMixin) {

	'use strict';

	var SettingsTagsView = BaseView['default'].extend(PaginationScrollMixin['default']);

	exports['default'] = SettingsTagsView;

});
define('ghost/views/settings/tags/settings-menu', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var TagsSettingsMenuView = Ember['default'].View.extend({
        saveText: Ember['default'].computed("controller.model.isNew", function () {
            return this.get("controller.model.isNew") ? "Add Tag" : "Save Tag";
        }),

        // This observer loads and resets the uploader whenever the active tag changes,
        // ensuring that we can reuse the whole settings menu.
        updateUploader: Ember['default'].observer("controller.activeTag.image", "controller.uploaderReference", function () {
            var uploader = this.get("controller.uploaderReference"),
                image = this.get("controller.activeTag.image");

            if (uploader && uploader[0]) {
                if (image) {
                    uploader[0].uploaderUi.initWithImage();
                } else {
                    uploader[0].uploaderUi.reset();
                }
            }
        })
    });

    exports['default'] = TagsSettingsMenuView;

});
define('ghost/views/settings/users', ['exports', 'ghost/views/settings/content-base'], function (exports, BaseView) {

	'use strict';

	var SettingsUsersView = BaseView['default'].extend();

	exports['default'] = SettingsUsersView;

});
define('ghost/views/settings/users/user', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    var SettingsUserView = Ember['default'].View.extend({
        currentUser: Ember['default'].computed.alias("controller.session.user"),

        isNotOwnProfile: Ember['default'].computed("controller.user.id", "currentUser.id", function () {
            return this.get("controller.user.id") !== this.get("currentUser.id");
        }),

        isNotOwnersProfile: Ember['default'].computed.not("controller.user.isOwner"),

        canAssignRoles: Ember['default'].computed.or("currentUser.isAdmin", "currentUser.isOwner"),

        canMakeOwner: Ember['default'].computed.and("currentUser.isOwner", "isNotOwnProfile", "controller.user.isAdmin"),

        rolesDropdownIsVisible: Ember['default'].computed.and("isNotOwnProfile", "canAssignRoles", "isNotOwnersProfile"),

        deleteUserActionIsVisible: Ember['default'].computed("currentUser", "canAssignRoles", "controller.user", function () {
            if (this.get("canAssignRoles") && this.get("isNotOwnProfile") && !this.get("controller.user.isOwner") || this.get("currentUser.isEditor") && (this.get("isNotOwnProfile") || this.get("controller.user.isAuthor"))) {
                return true;
            }
        }),

        userActionsAreVisible: Ember['default'].computed.or("deleteUserActionIsVisible", "canMakeOwner")

    });

    exports['default'] = SettingsUserView;

});
define('ghost/views/settings/users/users-list-view', ['exports', 'ember', 'ghost/mixins/pagination-view-infinite-scroll'], function (exports, Ember, PaginationViewMixin) {

    'use strict';

    var UsersListView = Ember['default'].View.extend(PaginationViewMixin['default'], {
        classNames: ["js-users-list-view"]
    });

    exports['default'] = UsersListView;

});
/* jshint ignore:start */

/* jshint ignore:end */

/* jshint ignore:start */

define('ghost/config/environment', ['ember'], function(Ember) {
  var prefix = 'ghost';
/* jshint ignore:start */

try {
  var metaName = prefix + '/config/environment';
  var rawConfig = Ember['default'].$('meta[name="' + metaName + '"]').attr('content');
  var config = JSON.parse(unescape(rawConfig));

  return { 'default': config };
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

/* jshint ignore:end */

});

if (runningTests) {
  require("ghost/tests/test-helper");
} else {
  require("ghost/app")["default"].create({"LOG_ACTIVE_GENERATION":true,"LOG_TRANSITIONS":true,"LOG_TRANSITIONS_INTERNAL":true,"LOG_VIEW_LOOKUPS":true,"name":"ghost","version":"0.6.4"});
}

/* jshint ignore:end */
