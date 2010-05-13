 /* global Ext */

 /**
    jit.js 2.0 beta
  ************************************************************************************

   $JIT [Dynamic Resource loader (basex 3.1+ support required)]

  ************************************************************************************
  * Author: Doug Hendricks. doug[always-At]theactivegroup.com
  * Copyright 2007-2010, Active Group, Inc.  All rights reserved.
  ************************************************************************************

  License: ext-basex and $JIT are licensed under the terms of : GNU Open Source GPL 3.0 license:

  Commercial use is prohibited without contacting licensing[at]theactivegroup.com.

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see < http://www.gnu.org/licenses/gpl.html>.

   Donations are welcomed: http://donate.theactivegroup.com

  */
  

   if(typeof Ext == undefined || !Ext.hasBasex)
      {throw "Ext and ext-basex 3.1 or higher required.";}

  (function(){
    
    /**
     * private -- <script and link> tag support
     */
    var A = Ext.lib.Ajax,
        StopIter = "StopIteration",
        defined = function(test){return typeof test !== 'undefined';},
        emptyFn = function(){},
        jsRe = /js/i,
        cssRe = /css/i,
        OP = Object.prototype,
        isObject = function (e) { return !!e && OP.toString.call(e) === "[object Object]"; },
        isArray = function(obj){ return OP.toString.apply(obj) == '[object Array]'; },
        isDefined = function(test){return typeof test != 'undefined';},
        uniqueMembers = function(objects, member){
           var k = {}, key, results = [];
           forEach([].concat(objects), function(obj){
              key = String(obj[member]);
              this[key] || results.push(obj);
              this[key] = true;
           },k);
           return results;
        };
    
    
    /**
     * @class Ext.ux.ModuleManager
     * @version 2.0 beta
     * ***********************************************************************************
     * @author Doug Hendricks. doug[always-At]theactivegroup.com 
     * @copyright 2007-2010, Active Group, Inc. All rights reserved.
     * ***********************************************************************************
     * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
     * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
     *
     * Commercial Use is prohibited without contacting
     * licensing[at]theactivegroup.com.
     *
     * This program is free software: you can redistribute it and/or modify
     * it under the terms of the GNU General Public License as published by
     * the Free Software Foundation, either version 3 of the License, or any
     * later version.
     *
     * This program is distributed in the hope that it will be useful, but
     * WITHOUT ANY WARRANTY; without even the implied warranty of
     * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
     * General Public License for more details.
     *
     * You should have received a copy of the GNU General Public License
     * along with this program. If not, see <
     * http://www.gnu.org/licenses/gpl.html>.
     *
     * Donations are welcomed: http://donate.theactivegroup.com
     *
     * @constructor - creates a new instance of ux.ModuleManager 
     * @methodOf Ext.ux.ModuleManager @param {Object} config
     * @example
     * Sample Usage:
     *
     * YourApp.CodeLoader = new
     * Ext.ux.ModuleManager({modulePath:yourBasePath });
     * YourApp.CodeLoader.on({ 'beforeload':function(manager, module,
     * response){
     *
     * //return false to prevent the script from being executed. return
     * module.extension == 'js';
     *  } ,scope:YourApp.CodeLoader });
     *
     * //Create a useful 'syntax' for your App.
     *
     * YourApp.needs =
     * YourApp.CodeLoader.load.createDelegate(YourApp.CodeLoader);
     * YourApp.provide =
     * YourApp.CodeLoader.provides.createDelegate(YourApp.CodeLoader);
     *
     * YourApp.needs('ext/layouts','js/dragdrop','js/customgrid','style/custom.css');
     *
     *
     * Configuration options
     */
    Ext.namespace('Ext.ux');
    
    /** @private */
    var gather = function(method, url, callbacks, data, options) {

        var tag, attribs;
        callbacks || (callbacks = {});
        
        if (method == 'SCRIPT') {
            tag  = method;
            attribs = {
                 type : "text/javascript",
                  src : url
             };
            
        } else if (method == 'LINK') {
            tag = method;
            attribs = {
                    rel : "stylesheet",
                    type : "text/css",
                    href : url
                    };   
        }
        return tag ? A.monitoredNode(tag, attribs, callbacks, options.target || window) :
                 A.request.apply(A,arguments);
     };
     
    Ext.ux.ModuleManager = function(config) {

        Ext.apply(this, config || {}, {
                    modules    : {},
                    modulePath : function() { // based on current page
                        var d = location.href.indexOf('\/') != -1
                                ? '\/'
                                : '\\';
                        var u = location.href.split(d);
                        u.pop(); // this page
                        return u.join(d) + d;
                    }()
                });

        this.addEvents({
            /**
             * @event loadexception Fires when any exception is raised. 
             *     Returning false prevents any subsequent pending module load requests
             * @param {Ext.ux.ModuleManager} this
             * @param {String} module -- the module object
             * @param {Object} error -- An error object containing:
             *            httpStatus, httpStatusText, error object
             */
            "loadexception" : true,

            /**
             * @event alreadyloaded Fires when the ModuleManager
             *        determines that the requested module has
             *        already been loaded
             * @param {Ext.ux.ModuleManager}
             *            this
             * @param {String}
             *            module -- the module object
             */
            "alreadyloaded" : true,

            /**
             * @event load Fires when the retrieved content has been
             *        successfully loaded
             * @param {Ext.ux.ModuleManager}
             *            this
             * @param {String}
             *            module -- the module name
             * @param {Object}
             *            response -- the Ajax response object
             * @param {String}
             *            contents -- the raw text content retrieved
             * @param {Boolean}
             *            executed -- true if the resource was
             *            executed into the target context.
             */
            "load" : true,

            /**
             * @event beforeload Fires when the request has
             *        successfully completed and just prior to eval
             *        returning false prevents the content (of this
             *        module) from being loaded (eval'ed)
             * @param {Ext.ux.ModuleManager}
             *            this
             * @param {String}
             *            module -- the module name
             * @param {Object}
             *            response - the Ajax response object
             * @param {String}
             *            contents -- the raw text content retrieved
             */
            "beforeload" : true,

            /**
             * @event complete Fires when all module load request
             *        have completed (successfully or not)
             * @param {Ext.ux.ModuleManager}
             *            this
             * @param {Boolen}
             *            success
             * @param {Array}
             *            loaded -- the modules now available as a
             *            result of (or previously -- already
             *            loaded) the last load operation.
             * @param {Array}
             *            executed -- modules that were executed
             *            (evaled) as a result of (or previously
             *            executed) the last load operation.
             */
            "complete" : true,

            /**
             * @event timeout Fires when module {@link #load} or
             *        {@link #onAvailable} requests have timed out.
             * @param {Ext.ux.ModuleManager} this
             * @param {Object/String} module module descriptor object or module name of the last pending module
             */
            "timeout" : true
        });
        Ext.ux.ModuleManager.superclass.constructor.call(this);

    };
    
    Ext.extend(Ext.ux.ModuleManager, Ext.util.Observable, {
        /**
         * @cfg {Boolean} disableCaching True to ensure the the browser's
         *      cache is bypassed when retrieving resources.
         */
        disableCaching : false,
        

        /**
         * @cfg {String} method The default request method used to retrieve
         *      resources. This method may also changed in-line during a
         *      {@link #load) operation. Supported methods:
         *      <ul>
         *      <li>DOM - Retrieve the resource by <SCRIPT/LINK> tag
         *      insertion</li>
         *      <li>GET Retrieve the resource by Ajax Request</li>
         *      <li>POST</li>
         *      <li>PUT</li>
         *      </ul>
         */

        method : 'GET',

        /**
         * @cfg {Boolean} noExecute Permits retrieval of a resource without
         *      script execution of the results. This option may also be
         *      changed in-line during a {@link #load) operation.
         */

        noExecute : false,
        /**
         * @cfg {Boolean} asynchronous Sets the default behaviour for AJAX
         *      requests onlu This option may also be changed in-line
         *      (async: true) during a {@link #load) operation.
         */

        asynchronous : true,

        /**
         * @cfg {Boolean} cacheResponses True, saves any content received in
         *      a content object with the following structure:
         *
         * This option may also be changed in-line during a
         * {@link #load) operation.
         */

        cacheResponses : false,

        /**
         * @cfg {Integer} default onAvailable/load method timeout value in
         *      milliseconds
         */

        timeout : 30000,

        /**
         * @cfg {Boolean} True retains the resulting content within each
         *      module object for debugging.
         */

        debug : false,

        loaded : function(name) {
            var module;
            return (module = this.getModule(name))? module.loaded === true : false;
        },

        /**
         * returns a defined module by name
         */
        getModule : function(name) {
            if(name && (name = name.name || name)){
                return this.modules[name] || null;
            }
        },
       
        /**
         * @private 
         */
        createModule : function(name, options) {
            var mod = this.getModule(name) || this.modulate(name, options);
            this.modules[mod.name] || (this.modules[mod.name]= mod); 
            return mod;
        },
        
        /**
         * @private 
         */
        modulate : function(moduleName, options) {
	        if (!moduleName) { return null; }
	        options = options || {};
            
	        var mname = String(moduleName.name || moduleName),
	            mod   = isObject(moduleName) ? moduleName : {},
                parts = mname.trim().split('\/'), 
	            name = Ext.value(mod.name, parts.last()),
	            fname = name.indexOf('.') !== -1 ? mname : mname + '.js',
	            path = mod.path || options.path || '';
	
	        return Ext.apply(mod, {
	                    name      : name,
	                    fullName  : fname,
	                    extension : fname.split('.').last().trim().toLowerCase(),
	                    path      : path,
	                    url       : mod.url || options.url  || (path + fname),
	                    options   : options,
	                    executed  : false,
	                    contentType : '',
	                    content   : null,
	                    loaded    : false,
	                    pending   : false,
                        virtual   : !!options.virtual,
                        none      : !!options.none
                        
	                });
	        
	    },

        /**
         * Assert loaded status of module name arguments and invoke
         * callback(s) when all are available
         *
         * @param {Array/String}
         *            modules A list of module names to monitor
         * @param {Function}
         *            callback The callback function called when all named
         *            resources are available or timeout
         * @param (Object)
         *            scope The execution scope of the callback
         * @param {integer}
         *            timeout The timeout value in milliseconds.
         */

        onAvailable : function(modules, callbackFn, scope, timeout, options) {

            if (arguments.length < 2) {
                return false;
            }

            var MM = this,
                block = {

	                modules : new Array().concat(modules),
	                poll : function() {
	                    
	                    var depends = (window.$JIT ? $JIT.depends : null) || {};
	                    var assert = this.polling ? this.modules.every( function(arg, index, args) {
	                           
	                           var modName = arg.replace('@',''),virtual = false, test=true;
	                           if(depends[modName] && 
	                             ((virtual = depends[modName].virtual || false) || 
                                    (isArray(depends[modName].depends) && 
	                                  !!depends[modName].length ))){
	                               test = depends[modName].depends.every(arguments.callee);
	                               test = virtual ? test && ((MM.getModule(modName)||{}).loaded = true): test;
	                           }
	                           
	                           test = test && (virtual || MM.loaded(modName) === true);
	                           block.pendingModule = test ? null : MM.getModule(modName); 
	                           return test;
	                    }) : false;
	
	                    if (!assert && this.polling && !this.aborted) {
	                        this.poll.defer(50, this);
	                        return;
	                    }
	
	                    this.stop();
                        this.pendingModule && (this.pendingModule.timedOut = this.timedOut);
	                    Ext.isFunction(callbackFn) && callbackFn.call(scope, assert, this.timedOut, this.pendingModule);
	
	                },
	
	                polling : false,
	
	                abort : function() {
	                    this.aborted = true;
	                    this.stop();
	                },
	
	                stop : function() {
	                    this.polling = false;
	                    this.timer && clearTimeout(this.timer);
	                    this.timer = null;
	                },
	
	                timer : null,
	
	                timeout : parseInt(timeout || MM.timeout, 10) || 10000,
	
	                onTimeout : function() {
	                    this.timedOut = true;
	                    this.abort();
	                },
	
	                retry : function(timeout) {
	
	                    this.stop();
	                    this.polling = true;
	                    this.aborted = this.timedOut = false;
	                    this.timer = this.onTimeout.defer(timeout || this.timeout, this);
	                    this.poll();
	                    return this;
	                }
	            };
            return block.retry();
        },

        /**
         * A mechanism for modules to identify their presence when loaded
         * via conventional <script> tags or nested on other scripts.
         *
         * @param {String}
         *            module names(s) Usage:
         *
         * <pre><code>
         * Ext.Loader.provides('moduleA', 'moduleB');
         * </code></pre>
         */

        provides : function() {
            forEach(arguments, function(module) {

                        var moduleObj = this.createModule(module);
                        moduleObj.loaded || //already loaded ?
                            Ext.apply(moduleObj, {
                                    executed : jsRe.test(moduleObj.extension),
                                    contentType : '',
                                    content : null,
                                    loaded : true,
                                    pending : false
                                });
                    }, this);

        },
        /**
         * load external resources in dependency order alternate load
         * syntax:
         *
         * <pre><code>
         *           load( 'moduleA', 'path/moduleB'  );
         *           load( {module:['modA','path/modB'], callback:cbFn, method:'DOM', queue:'fast', ... });
         *           load( {async:false, listeners: {complete: onCompleteFn, loadexception: loadExFn }}, 'moduleA', inlineFn, {async:true}, 'moduleB', inlineFn, .... );
         *
         * </code></pre>
         *
         * @name load
         * @methodOf Ext.ux.ModuleManager
         * @param {Mixed}
         *            args One or more module definitions, inline functions
         *            to be execute in sequential order
         */


        load : function(modList) {

            try {
                var task = new Task(this, isArray(modList) ? modList : Array.slice(arguments, 0));
                task.start();

            } catch (ex) {
                
                if (ex != StopIter) {

                    if (task) {
                        task.lastError = ex;
                        task.active = false;
                    }
console.error(ex)
                    this.fireEvent('loadexception', this, task
                                    ? task.currentModule
                                    : null, this.lastError = ex);
                }
            }

            return task;
        },


        globalEval : function(data, scope, context) {
            scope || (scope = window);
            data = String(data || "").trim();
            if (data.length === 0) {return false;}
            try {
                if (scope.execScript) {
                    // window.execScript in IE fails when scripts include
                    // HTML comment tag.
                    scope.execScript(data.replace(/^<!--/, "").replace(/-->$/, ""));

                } else {
                    // context (target namespace) is only support on Gecko.
                    eval.call(scope, data, context || null);
                }
                return true;
            } catch (ex) {
                return ex;
            }

        },
        styleAdjust : null,

        applyStyle : function(module, styleRules, target) {
            var rules;
            if (module = this.getModule(module)) {

                // All css is injected into document's head section
                var doc = (target || window).document;
                var ct = (styleRules
                        || (module.content ? module.content.text : '') || '')
                        + '';
                var head;
                if (doc && !!ct.length
                        && (head = doc.getElementsByTagName("head")[0])) {

                    if (module.element) {
                        this.removeModuleElement(module);
                    }
                    if (this.styleAdjust && this.styleAdjust.pattern) {
                        // adjust CSS (eg. urls (images etc))
                        ct = ct.replace(this.styleAdjust.pattern,
                                this.styleAdjust.replacement || '');
                    }

                    rules = doc.createElement("style");
                    module.element = Ext.get(rules);
                    A._domRefs.push(module.element);
                    rules.setAttribute("type", "text/css");
                    if (Ext.isIE) {
                        head.appendChild(rules);
                        rules.styleSheet.cssText = ct;
                    } else {
                        try {
                            rules.appendChild(doc.createTextNode(ct));
                        } catch (e) {
                            rules.cssText = ct;
                        }
                        head.appendChild(rules);
                    }
                }
            }
            return rules; // the style element created
        },

        /**
         * Remove a style element
         *
         * @name removeStyle
         * @param {Mixed}
         *            module A Ext.ux.ModuleManager.module or dom Node
         * @return {Ext.Element} the element removed.
         */

        removeStyle : function(module) {
            return this.removeModuleElement(module);
        },

        /** @private */
        // Remove an associated module.element from the DOM

        removeModuleElement : function(module) {
            var el;
            if (module = this.getModule(module)) {
                if (el = module.element) {
                    el.dom ? el.removeAllListeners().remove(true) : Ext.removeNode(el);
                    A._domRefs.remove(el);
                }
                module.element = el = null;
            }

        },
        destroy : function(){
            forEach(this.modules,
               function(module, name){
                this.removeModuleElement(name);
                delete this.modules[name];
               }, this);
        }
    });

    var Task = Ext.ux.ModuleManager.Task = function(MM, modules) {

        Ext.apply(this, 
            {
            result : true,
            active : false,
            options : null,
            executed : new Array(),
            loaded : new Array(),
            params : null,
            data : null,
            oav : null,
            timedOut : false,
            unlisteners : new Array(),
            MM : MM,
            id : Ext.id(null, 'mm-task-'),
            defOptions : {
                async : MM.asynchronous,
                headers : MM.headers || false,
                modulePath : MM.modulePath,
                forced : false,
                cacheResponses : MM.cacheResponses,
                method : (MM.noExecute || MM.cacheResponses
                        ? 'GET'
                        : MM.method || 'GET').toUpperCase(),
                noExecute : MM.noExecute || false,
                disableCaching : MM.disableCaching,
                timeout : MM.timeout,
                callback : null,
                scope : null,
                params : null
            }
        });
        this.options = Ext.apply({},this.defOptions);
        this.prepare(modules);

    };
   
    Ext.apply(Task.prototype, {
        /**
         *  @private
         *
         */

        start : function() {
            this.active = true;
            this.oav = this.MM.onAvailable.call(this.MM,
                        this.onAvailableList, this.onComplete, this,
                        this.options.timeout, this.options);
                                   
            this.nextModule();
            
        },

        /**
         *  @private
         *
         */
        doCallBacks : function(options, success, currModule, args) {
            var cb, C;
            
            if (C = currModule) {
                var timedOut = C.timedOut || this.timedOut, 
                    res = this.timedOut || this.MM.fireEvent.apply(this.MM, [
                                (success ? 'load' : 'loadexception'),
                                this.MM, C ].concat(args || []));
                
                success || (this.active = (!timedOut && res !== false));

                // Notify other pending async listeners
                if (isArray(C.notify)) {
                    forEach(C.notify, 
                        function(chain, index, chains) {
                                if (chain) {
                                    chain.nextModule();
                                    chains[index] = null;
                                }
                            });
                    C.notify = [];
                }
               
                //script Tag cleanup
                if(C.element && !options.debug && jsRe.test(C.extension) && options.method == 'DOM'){
                         
                    C.element.removeAllListeners();  
	                var d = C.element.dom;
                    if(Ext.isIE){
                        //Script Tags are re-usable in IE
                        A.SCRIPTTAG_POOL.push(C.element);
                    }else{

                        C.element.remove();
                        //Other Browsers will not GBG-collect these tags, so help them along
                        if(d){
                            for(var prop in d) {delete d[prop];}
                        }
                        A._domRefs.remove(C.element);
                    }
                    d = null;
                    delete C.element;
                }
                
            }
            //this.nextModule();
        },

        /**
         *  @private
         *
         */
        success : function(response , ev, target ) {
            
            var module = response.argument.module, 
                opt = module.options, 
                executable = (!opt.proxied && jsRe.test(module.extension) && !opt.noExecute && opt.method !== 'DOM'), 
                cbArgs = null,
                MM = this.MM;
            
            this.currentModule = module.name;

            if (!module.loaded) {
                try {
                    
                    if (MM.fireEvent('beforeload', MM, module,
                            response, response.responseText) !== false) {

                        Ext.apply(module, {
                            loaded : true,
                            pending : false,
                            contentType : response.contentType || (module.element ? Ext.get(module.element).getAttributeNS(null,'type'):''),
                            content : opt.cacheResponses
                                    || cssRe.test(module.extension) ? {
                                text : response.responseText || null,
                                XML : response.responseXML || null,
                                JSON : response.responseJSON || null,
                                parts : response.parts
                           
                            } : null
                        });

                        this.loaded.push(module);
                        var exception = executable
                                && (!module.executed || opt.forced)
                                ? MM.globalEval(response.responseText, opt.target)
                                : true;
                        if (exception === true) {
                            if (executable) {
                                module.executed = true;
                                this.executed.push(module);
                            }
                            cbArgs = [response, response.responseText, module.executed];
                            if(cssRe.test(module.extension) && opt.applyStyle){
                                 MM.applyStyle(module.name, null, opt.target);
                            }
                        } else {
                            // coerce to actual module URL
                            throw Ext.applyIf({
                                        fileName : module.url,
                                        lineNumber : exception.lineNumber || 0
                                    }, exception);
                        }
                    }

                } catch (exl) {
                    cbArgs = [{
                                error : (this.lastError = exl),
                                httpStatus : response.status,
                                httpStatusText : response.statusText
                            }];
                    this.result = false;
                }

                this.doCallBacks(opt, this.result, module, cbArgs);
            } else {
                opt.async && this.nextModule();
            }

        },

        /**
         *  @private
         *
         */

        failure : function(response) {
           console.info(arguments);
            var module = response.argument.module, opt = module.options;
            module.contentType = response.contentType || '';
            this.currentModule = module.name;
            this.active = this.result = module.pending = false;

            this.doCallBacks(opt, this.result , module, [{
                        error : (this.lastError = response.fullStatus.error),
                        httpStatus : response.status,
                        httpStatusText : response.statusText
                    }]);
        },

        /**
         *  @private
         *
         */

        nextModule : function() {
            var module, transport, executable, options, url,
                params = null, data = null, moduleObj;

            while (module = this.workList.shift()) {

//                console.log(this.active,module)
                // inline callbacks
                if (Ext.isFunction(module)) {
                    module.apply(this.options.scope || this, [this.result, null, this.loaded]);
                    continue;
                }
                
                if(!this.active)continue;
                
                // setup possible single-use listeners for the current
                // request chain
                if (module.listeners) {
                    this.unlisteners.push(module.listeners);
                    this.MM.on(module.listeners);
                    delete module.listeners;
                }
                params = null, data = null;
                
                if (module.name || Ext.isString(module)) {
                    
                    moduleObj = this.MM.createModule(module );        
                    options = moduleObj.options = Ext.apply({}, moduleObj.options , this.options);
	                console.info(moduleObj.name,moduleObj,moduleObj.loaded);
                    
                    if (!moduleObj.loaded || options.forced) {
                        if (params = options.params) {
	                        Ext.isFunction(params)&& (params = params.call(options.scope || window,options));
	                        isObject(params) && (params = Ext.urlEncode(params));
	                        data = params; // setup for possible post
	                    }
	                    url = moduleObj.url;
	
	                    executable = (!options.proxied
	                            && jsRe.test(moduleObj.extension) && !options.noExecute);

                        if (!moduleObj.pending || options.forced) {
                            moduleObj.pending = true;
                            
                            var callback = {
                                success : this.success,
                                failure : this.failure,
                                scope : this,
                                argument : {
                                    module : moduleObj
                                }
                            };
                            
                            /**
                             * Due to LINK tag onload limitations, CSS via GET only supported
                             */
                            if(cssRe.test(moduleObj.extension)){
	                            options.cacheResponses = true;
	                            options.method = options.method == 'DOM'? 'GET' : options.method;
                            }
                            
                            options.async = options.method === 'DOM'
                                    ? true
                                    : options.async;
                                    
                            if (/get|script|dom|link/i.test(options.method)) {
                                url += (params ? '?' + params : '');
                                if (options.disableCaching == true) {
                                    url += (params ? '&' : '?') + '_dc=' + (new Date().getTime());
                                }
                                data = null;
                            }
                                    
                            transport = gather(
                                        options.method == 'DOM' ? 'SCRIPT': options.method,
                                        url, 
                                        callback,
                                        data,
                                        options);
                                        
                            moduleObj.element = options.method == 'DOM' ? transport : null;
                            
                            
                        }
                        if (options.async) { break; }

                    } else {
                        console.warn('already', moduleObj);
                        this.active = this.MM.fireEvent('alreadyloaded', this.MM, moduleObj) !== false;
                        executable && this.executed.push(moduleObj);
                        this.loaded.push(moduleObj);
                    }

                } // end if named module
                else {
                    Ext.apply(this.options, module);  //a serial configuration update 
                }
            } // oe while(module)

            if (this.active && module && moduleObj && moduleObj.options.async ) {
                moduleObj.notify || (moduleObj.notify = new Array());
                moduleObj.notify.push(this);
            }

        },

        /**
         *  @private
         * Normalize requested modules and options into a sequential series
         * of load requests and inline callbacks
         */

        prepare : function(modules) {
  
            var onAvailableList = new Array(),
                mod,
                opts,
                MM = this.MM,
                resolve = (function(module) {
                
	                if (!module)return null;
	                mod = null;
	                                
	                if(Ext.isString( module)){  // a named resource
	                    mod = MM.createModule(module, opts );
	                }else if (isArray(module)){
	                    return module.map(resolve);
	                }else if (isObject(module) && module.name){ // an inline options override with (optional) array of modules
	                    var mOptions = opts || module.options;
	                    if (mOptions.proxied) {
	                        mOptions.method = 'GET';
	                        mOptions.cacheResponses = mOptions.async = true;
	                    }
	                   // for notation
	                   // {name:'something', url:'assets/something'}
	                    mod = MM.createModule(module, mOptions);
	                  }else if (isObject(module)){
	                    
	                    // coerce to array to support this notation:
	                    // {name:'scriptA' or
	                    // {modules:['name1',{name : 'name2', method : 'GET'} ],callback:cbFn,...
	                    // so that callback is only called when the last
	                    // in the implied list is loaded.
	                    
	                    if (Ext.isArray(module.modules)) {
	                        return [module].concat(module.modules.map(resolve));
	                    }else{
                            mod = module;
                        }
	                  }else if(Ext.isFunction(module)){
	                      mod = module;
	                  }
	                  opts = null;
	                  
	                  if(!mod ||  mod.virtual || mod.none) return null;
	                  if(isObject(mod) && mod.name){
		                  onAvailableList.push(mod.name);
	                  }
	                  return mod;
	                
	            }).createDelegate(this);
            
            this.workList = modules.map(resolve).flatten().compact();
            this.onAvailableList = onAvailableList.flatten().unique();
            
//            console.log('thiList',this.workList )
            
        },

        /**
         * @private
         */
        onComplete : function(loaded, timedOut, lastModule) { 
            
            var cb = this.options.callback,
                MM = this.MM;
            
            this.timedOut = !!timedOut;
            
            if(this.result = loaded){
	            cb && cb.apply(this.options.scope || this, [this.result, this.loaded, this.executed]);
                MM.fireEvent('complete', MM, this.result, this.loaded, this.executed);
                
            }else if(this.active && (this.timedOut || lastModule.timedOut)){
                cb && cb.apply(this.options.scope || this, [this.result, this.loaded, this.executed]);
                MM.fireEvent('timeout', MM, lastModule , this.executed);
            }
            
            // cleanup single-use listeners from the previous request chain
            if (this.unlisteners) {
                forEach(this.unlisteners, function(block) {
                    forEach(block, function(listener, name,
                                    listeners) {
                                var fn = listener.fn || listener;
                                var scope = listener.scope
                                        || listeners.scope
                                        || this.MM;
                                var ev = listener.name || name;
                                this.MM.removeListener(ev, fn,
                                        scope);
                            }, this);
                }, this);
            }
            
            this.active = false;
            this.nextModule(); //Flush any remaining inline callbacks
        }
    });

    //Enable local file access for IE
    Ext.lib.Ajax.forceActiveX = (Ext.isIE7 && document.location.protocol == 'file:');

    var L = Ext.Loader = new Ext.ux.ModuleManager({

        modulePath : '',  //adjust for site root
        method : 'DOM',
        depends  : {},  // Ext dependency table
        disableCaching : true,

        getMap:function(module){

            var result = new Array(), 
                options = isObject(module) ? module : {},
                M;

            forEach([].concat(module),
              function(mod, options){
                
                var c=arguments.callee,
                    moduleName = isObject(mod)? mod.name || null : mod,
                    map;
                    
                Ext.isString(moduleName) && (moduleName = moduleName.replace("@",""));
              
                (map = moduleName ? this.depends[moduleName] : null)
                    && forEach(map.depends||[] ,
	                    function(module, index, dep){
	                        //chain dependencies
	                        Ext.isString(module) && module.substr(0,1)=="@" && this.depends[module.replace("@","")]?
	                            c.call(this, module, map):
	                              result.push( module );
	                    },
                      this);
                
                if(mod){
	                if(map){
                        map = Ext.apply({}, Ext.isObject(mod) ? mod : {}, map);
	                    moduleName && result.push(L.createModule( moduleName, map)); 
	                }else{
                        result.push(mod);
                    }
                }
            },this);
           
            return uniqueMembers(result, 'name');
        },

        styleAdjust  : {pattern:/url\(\s*\.\.\//ig, replacement:'url(resources/'}

    });


    /**
     * @class $JIT
     * @version 2.0 beta
     * @author Doug Hendricks. doug[always-At]theactivegroup.com 
     * @copyright 2007-2010, Active Group, Inc. All rights reserved.
     * @donate <a target="tag_donate" href="http://donate.theactivegroup.com"><img border="0" src="http://www.paypal.com/en_US/i/btn/x-click-butcc-donate.gif" border="0" alt="Make a donation to support ongoing development"></a>
     * @license <a href="http://www.gnu.org/licenses/gpl.html">GPL 3.0</a>
     * @singleton
     * @static
     * @description Load external resources in dependency order by any transport supported by the ext-basex adapter.
     * <p>For an online demonstration of $JIT in action, <a href="http://demos.theactivegroup.com/?demo=basex&script=multipart" target="tagdemo">click here.</a>
     * @example
     * Flexible load syntaxes:
     *
     * $JIT( 'moduleA', 'path/moduleB', function(loaded, modules){
     *     if(loaded){
     *        var t = new justLoadedClass();
     *       }
     *  });
     *  
     * //or, A long running request can be evaluated asynchronously later:
     * $JIT.onAvailable (['moduleA', 'uxpackage'], function(loaded){
     *     if(loaded){
     *        var t = new justLoadedClass();
     *       }
     * });
     * 
     * $JIT( {module:['modA','path/modB'],
     *      callback: cbFn,
     *      scope: null,  //callback scope
     *      modulePath : 'assets/scripts/', //(optional) root for request chain
     *      disableCaching : true, //prevent browser caching of modules
     *      cacheResponses : false, //true to cache the text content of the module
     *      async : false // synchronous request 
     *      method:'DOM', //others: 'GET', 'POST', 'DOM' writes to script tags for debugging
     *      proxied : false //if true or config, uses the JSONP transport
     *      xdomain : false,  //(optional) for modern browsers supporting cross-domain requests  
     *      queue:{name:'fast', priority: 2}, //(optional) Queuing support 
     *      ... });
     *
     * //Inline callbacks
     * $JIT( {
     *      async    :false, //start out synchronous mode
     *      listeners: {
     *          complete: onCompleteFn,
     *          loadexception: loadExFn
     *        }
     *      },
     *      'moduleA',
     *      progressFn,
     *      {async:true}, //switch to asynchronous mode
     *      'moduleB',
     *      progressFn, .... );
     *
     * //Define logical dependencies: (Adjust to suite your site layout.)
     *  
     *  var ux= 'ux/';
     *  Ext.apply( $JIT.depends , {
     *  // JS source file | source location | Dependencies (in required load order)
     *   'uxvismode'   :   {path: ux }
     *  ,'uxmedia'     :   {path: ux ,          depends: [ '@uxvismode']}
     *  ,'uxflash'     :   {path: ux ,          depends: [ '@uxmedia'] }
     *  ,'uxchart'     :   {path: ux ,          depends: [ '@uxflash'] }
     *  ,'uxfusion'    :   {path: ux ,          depends: [ '@uxchart'] }
     *  ,'uxofc'       :   {path: ux ,          depends: [ '@uxchart'] }
     *  ,'uxamchart'   :   {path: ux ,          depends: [ '@uxchart'] }
     *  ,'uxflex'      :   {path: ux ,          depends: [ '@uxflash'] }
     *  ,'mif'         :   {path: ux ,          depends: [ '@uxvismode' ] }
     *  ,'mifmsg'      :   {path: ux ,          depends: [ '@mif'] }
     *  ,'mifdd'       :   {path: ux ,          depends: [ '@mif'] }
     * });
     * 
     * //then, load as assembly:
     * $JIT('@uxfusion', callbackFn);
     * or
     * $JIT.onAvailable('uxfusion', callbackFn);
     *  
     * //$JIT also amends Ext.ComponentMgr to permit inline dynamic (synchronous-only)
     * loading of resources when using delayed-loading of Component configurations:
     *  
     *  new Ext.Panel({
     *     layout:'fit',
     *     items:{
     *        //demand and load 'customerform.js' and 'gmap' modules (if not already available)
     *        <b>require</b> : ['dialogs/customerform','gmap'],    
     *        xtype : 'tabpanel',
     *        items : {title:'Grid', <b>JIT:</b>'custom-grid',...}
     *      }
     *  });
     *  
     *  Another chained asynchronous method available is namespace/object polling:
     *  $JIT('ux/Rowediter').onClassAvailable('Ext.ux.grid.RowEditor',function(available){
              if(available){
                   var plugin = new Ext.ux.grid.RowEditor().init(this);
                   .....
              }
          },
          myGrid,
          30  //second timeout
         );
     *  
     *  
     *  //Load a script via script tag:
     *  $JIT.script('resources/script/admin[.js]', function(loaded){ ... } );
     *  
     *  //Make an Ajax request
     *  $JIT.post({params:{node:44}}, 'assets/treenodes.php',
     *   function(loaded, modules){
     *      if(loaded){
     *        var nodes = modules.first().content['JSON/text/XML'];
     *        ... 
     *      }
     *    });
     *    
     *  //Retrieve the content from a previously loaded (cached) resource:
     *  var text = $JIT.getModule('treenodes').content.text;
     *  
     *  //Load a CSS resource and apply it as a theme:
     *  $JIT.css('themes/brightblue.css', 'lightgreen.css' );
     *  
     *  $JIT.onAvailable('brightblue.css')
     *  .Then(
     *    function(){
     *     $JIT.applyStyle('brightblue.css');
     *   })
     *  .Else(
     *    function(){ 
     *      alert('Could not load them.');
     *   });
     *  //Stylesheet removal:
     *  $JIT.removeStyle('brightblue.css');
     */

    $JIT = function(){
        var modules = new Array();

        forEach(Array.slice(arguments, 0),
           function(module){
            modules = modules.concat(Ext.isFunction(module) ? module : L.getMap(module) );
         }, L);
        modules = modules.flatten(); 
        var _task;
        (function(){
	        _task = L.load.apply(L,modules.concat(
	          function(success){
	            var stack = $JIT[success?'thenStack':'elseStack'];
	            isArray(stack) && 
	                forEach(stack, function(cb){
	                   cb(this, this.loaded,success?'thenStack':'elseStack');
                       console.dir(this);
	                },_task); //scope is Task
	                
	            $JIT.thenStack=[];
	            $JIT.elseStack=[];
//                console.log(_task)
	        }));
        }).defer(10);
        
        return $JIT;
    };
    
    Ext.ux.$JIT = Ext.require = $JIT;
    
    var on = L.addListener.createDelegate(L),
        un = L.removeListener.createDelegate(L),
        jitWrap = function(method){
          return function(){
            method.apply(null,Array.slice(arguments,0));
            return $JIT;
          }
        };

    //create a unique flexible dialect for $JIT:
    Ext.apply($JIT,{

            /**
             * @name onAvailable
             * @methodOf $JIT
             * Invoke the passed callback when all named modules in the array are available
             * @param {Array,String} classList single of Array of string classNames to test.
             * @param {Function} callbackFn Callback function invoked with the following arguments:<p>
             *   {Boolean} success,
             *   {Array} classes</p>
             * @param {Object} scope Scope with call the callback with.
             * @param (Integer) timeout Number of seconds to wait before timeout (default 30 seconds)
             * @example
  $JIT.onAvailable(['tree','grid'], this.buildWin , scope,  timeout);
             */
            onAvailable : function(){
                L.onAvailable.apply(L, arguments);
                return $JIT;  
            },
            
            /**
             * @name onClassAvailable
             * @methodOf $JIT
             * Invoke the passed callback when all specified class Objects are available.
             * @param {Array,String} classList single of Array of string classNames to test.
             * @param {Function} callbackFn Callback function invoked with the following arguments:<p>
             *   {Boolean} success,
             *   {Array} classes</p>
             * @param {Object} scope Scope with call the callback with.
             * @param (Integer) timeout Number of seconds to wait before timeout (default 30 seconds)
             * @example
  $JIT.onClassAvailable('Ext.ux.grid.RowEditor',function(available){
      if(available){
         var plugin = new Ext.ux.grid.RowEditor().init(this);
         .....
      }
    },
    myGrid
    );
  
 or
 
 $JIT.onClassAvailable(['Ext.ux.grid.RowEditor','Ext.ux.ManagedIFrame'],classesAreHereFn);
             */
            onClassAvailable : (function(){ 
            
	            var options = null;
	            
	            var F = function OCAV(classList, callback, scope, timeout) { 
		               var o, 
		                   d, 
		                   classes=[],
		                   opt = {
		                      interval : 100,
		                      retries  : (timeout||30000)/100,
		                      callback : callback || Ext.emptyFn,
		                      scope    : scope || null
		                      };
		                     
	
	                   if(!options){
	                       options = Ext.clone(opt);
	                   }
		               
		               Ext.each([].concat(classList||[]).compact(), 
		                  function (v) {
		                     if(Ext.isString(v)){
			                     d = v.split(".");
			                     if(o = window[d[0]]){
				                     Ext.each(d.slice(1), 
				                        function (next) {
				                           return !!(o = o[next]);
				                       }); 
				                       o && classes.push(o);
			                      } else return false;
	                         }
		                 }); 
                         
                         //callback with the first Array element if only one
                         var C = classes.compact();
                         C = C.length < 2 ? C.first() : C;
                         
	                     if(!!o){ 
		                    options.callback.call(options.scope, true, C);
		                 }else{
		                    if(--options.retries){
	                           arguments.callee.defer(options.interval,this,arguments);
	                           return;
	                        }
		                    else {
	                           options.callback.call(options.scope, false, C);
	                        }
		                }
	                    options = null;
                        return $JIT;
		             };
	                 var OCAV = null;
	                 return F;
            })(),
            
            thenStack   :[],
            Then        : function(fn, scope){
                Ext.isFunction(fn) && this.thenStack.push(fn.createDelegate(scope||window));  
                return $JIT;
            },
            
            elseStack   :[],
            Else        : function(fn, scope){
                Ext.isFunction(fn) && this.elseStack.push(fn.createDelegate(scope||window));
                return $JIT;
            },

            //Logical Registration of a module  eg: $JIT.provide('mainAppStart');
            provide     : Ext.provide = L.provides.createDelegate(L),

            on          : on,
            addListener : on,
            un          : un,
            removeListener : un,
            depends     : L.depends,
            
            loaded      : L.loaded.createDelegate(L),
            getModule   : L.getModule.createDelegate(L),


            //Set the default module retrieval mechanism (DOM == <script, link> tags, GET,PUT,POST == XHR methods )
            setMethod   : function(method){
                              L.method = (method||'DOM').toUpperCase();
                              return $JIT;
                          },
            //Set the default site path (relative/absolute)
            setModulePath: function(path){
                              L.modulePath = path || '';
                              return $JIT;
                          },
            execScript  : L.globalEval.createDelegate(L),
            lastError   : function(){return L.lastError;},
            
            /**
             * @param {Integer} set/change the default onAvailable/load method timeout value in
             *      milliseconds
             */
            setTimeout  : function(tmo){ 
                            L.timeout = parseInt(tmo||0,10);
                            return $JIT;
                            },
            applyStyle  : L.applyStyle.createDelegate(L),
            removeStyle  : L.removeStyle.createDelegate(L),

            css         : jitWrap(L.load.createDelegate(L,[
                            {method        :'GET',
                             cacheResponses: true,
                             modulePath    :''
                             }],0)
                          ),

            script      : jitWrap(L.load.createDelegate(L,[
                            {method        :'DOM',
                             modulePath    :''
                             }],0)
                             ),

            get         : jitWrap($JIT.createDelegate(null,[
                            {method        :'GET',
                             modulePath    :''
                             }],0)
                           ),
                             
            post         : jitWrap(L.load.createDelegate(L,[
				            {method        :'POST',
				             modulePath    :''
				             }],0)
                           ),

            getCached   : jitWrap(L.load.createDelegate(L,[
                            {method        :'GET',
                             modulePath    :'',
                             cacheResponses: true
                             }],0)
                           )
    });

    $JIT.provide('jit','ext-basex');

    /*
     * 
      Sample global loadexception handler
    $JIT.on('loadexception',function(loader, module , ecode, title){
      
      if(!ecode)return;
      var ec = ecode.error || ecode;
      var msg = ec? ec.message || ec.description || ec.name || ecode: null;

      if(msg){
          msg.httpStatusText && ( msg = msg.httpStatus + ' ' + msg.httpStatusText);
          title = title || (module ? 'Error retrieving '+ (module.name || module) : '');
          if(Ext.MessageBox){
              Ext.MessageBox.alert(title ,msg);
          } else {
              alert((title?title+'\n':'')+msg );
          }
      }
    });
   */
   
    /* Add 'require/JIT' support (synchronous only) permitting progressive loads to lazy-loaded component configs
     new Ext.Panel({
        layout:'fit',
        items:{
           require : ['tabs','gmap'],    //demand and load 'tabs' and 'gmap' module configs if not already available
           xtype : 'tabpanel',
           items : {title:'Grid', JIT:'edit-grid',...}
         }
     });
     
     or
     
     var grid = $JIT.create({
         require : [{timeout: 15000}, 'customGrid.js'],
         title : 'User List',
         ....
      });
    */

    var mgr = Ext.ComponentMgr,
        load_options =
            {async    :false,
             method   :'GET',
             callback : function(completed){
                 !completed && 
                     L.fireEvent('loadexception', L, this.currentModule, "Ext.ComponentMgr:$JIT Load Failure");
             },
             scope : L
        },
        assert =  function(rm){
           return !!rm && typeof rm == 'object' ? Ext.apply({},load_options, rm): rm;
        };

    if(mgr){
       
       $JIT.create =
       Ext.create = 
       mgr.create = 
       mgr.create.createInterceptor( function(config, defaultType){

               var require= config.require || config.JIT;
               if(!!require){
                   require = [load_options].concat(require).map( assert ).compact();
                   //This synchronous request will block until completed
                   Ext.require.apply(Ext, require);

               }
          });

   }
 })();
