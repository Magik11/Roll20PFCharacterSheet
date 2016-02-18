//var getSectionIDs=function(){};
//var getAttrs=function(){};
//var setAttrs=function(){};
//var on=function(){};
/* ---- BEGIN: TheAaronSheet.js ---- */
// Github:   https://github.com/shdwjk/TheAaronSheet/blob/master/TheAaronSheet.js
// By:       The Aaron, Arcane Scriptomancer
// Contact:  https://app.roll20.net/users/104025/the-aaron

var TAS = TAS || (function () {
    'use strict';

    var version = '0.2.1',
        lastUpdate = 1453794214,

        loggingSettings = {
            debug: {
                key: 'debug',
                title: 'DEBUG',
                color: {
                    bgLabel: '#7732A2',
                    label: '#F2EF40',
                    bgText: '#FFFEB7',
                    text: '#7732A2'
                }
            },
            error: {
                key: 'error',
                title: 'Error',
                color: {
                    bgLabel: '#C11713',
                    label: 'white',
                    bgText: '#C11713',
                    text: 'white'
                }
            },
            warn: {
                key: 'warn',
                title: 'Warning',
                color: {
                    bgLabel: '#F29140',
                    label: 'white',
                    bgText: '#FFD8B7',
                    text: 'black'
                }
            },
            info: {
                key: 'info',
                title: 'Info',
                color: {
                    bgLabel: '#413FA9',
                    label: 'white',
                    bgText: '#B3B2EB',
                    text: 'black'
                }
            },
            notice: {
                key: 'notice',
                title: 'Notice',
                color: {
                    bgLabel: '#33C133',
                    label: 'white',
                    bgText: '#ADF1AD',
                    text: 'black'
                }
            },
            log: {
                key: 'log',
                title: 'Log',
                color: {
                    bgLabel: '#f2f240',
                    label: 'black',
                    bgText: '#ffff90',
                    text: 'black'
                }
            },
            callstack: {
                key: 'TAS',
                title: 'function',
                color: {
                    bgLabel: '#413FA9',
                    label: 'white',
                    bgText: '#B3B2EB',
                    text: 'black'
                }
            },
            callstack_async: {
                key: 'TAS',
                title: 'ASYNC CALL',
                color: {
                    bgLabel: '#413FA9',
                    label: 'white',
                    bgText: '#413FA9',
                    text: 'white'
                }
            },
            TAS: {
                key: 'TAS',
                title: 'TAS',
                color: {
                    bgLabel: 'grey',
                    label: 'black;background:linear-gradient(#304352,#d7d2cc,#d7d2cc,#d7d2cc,#304352)',
                    bgText: 'grey',
                    text: 'black;background:linear-gradient(#304352,#d7d2cc,#d7d2cc,#d7d2cc,#304352)'
                }
            }
        },


        config = {
            debugMode: false,
            logging: {
                log: true,
                notice: true,
                info: true,
                warn: true,
                error: true,
                debug: false
            }
        },

        callstackRegistry = [],
    	queuedUpdates = {}, //< Used for delaying saves till the last momment.

    complexType = function (o) {
        switch (typeof o) {
            case 'string':
                return 'string';
            case 'boolean':
                return 'boolean';
            case 'number':
                return (_.isNaN(o) ? 'NaN' : (o.toString().match(/\./) ? 'decimal' : 'integer'));
            case 'function':
                return 'function: ' + (o.name ? o.name + '()' : '(anonymous)');
            case 'object':
                return (_.isArray(o) ? 'array' : (_.isArguments(o) ? 'arguments' : (_.isNull(o) ? 'null' : 'object')));
            default:
                return typeof o;
        }
    },

	dataLogger = function (primaryLogger, secondaryLogger, data) {
	    _.each(data, function (m) {
	        var type = complexType(m);
	        switch (type) {
	            case 'string':
	                primaryLogger(m);
	                break;
	            case 'undefined':
	            case 'null':
	            case 'NaN':
	                primaryLogger('[' + type + ']');
	                break;
	            case 'number':
	            case 'not a number':
	            case 'integer':
	            case 'decimal':
	            case 'boolean':
	                primaryLogger('[' + type + ']: ' + m);
	                break;
	            default:
	                primaryLogger('[' + type + ']:=========================================');
	                secondaryLogger(m);
	                primaryLogger('=========================================================');
	                break;
	        }
	    });
	},


    colorLog = function (options) {
        var coloredLoggerFunction,
            key = options.key,
            label = options.title || 'TAS',
            lBGColor = (options.color && options.color.bgLabel) || 'blue',
            lTxtColor = (options.color && options.color.label) || 'white',
            mBGColor = (options.color && options.color.bgText) || 'blue',
            mTxtColor = (options.color && options.color.text) || 'white';

        coloredLoggerFunction = function (message) {
            console.log(
                '%c ' + label + ': %c ' + message,
                'background-color: ' + lBGColor + ';color: ' + lTxtColor + '; font-weight:bold;',
                'background-color: ' + mBGColor + ';color: ' + mTxtColor + ';'
            );
        };
        return function () {
            if ('TAS' === key || config.logging[key]) {
                dataLogger(coloredLoggerFunction, function (m) { console.log(m); }, _.toArray(arguments));
            }
        };
    },

    logDebug = colorLog(loggingSettings.debug),
    logError = colorLog(loggingSettings.error),
    logWarn = colorLog(loggingSettings.warn),
    logInfo = colorLog(loggingSettings.info),
    logNotice = colorLog(loggingSettings.notice),
    logLog = colorLog(loggingSettings.log),
    log = colorLog(loggingSettings.TAS),
    logCS = colorLog(loggingSettings.callstack),
    logCSA = colorLog(loggingSettings.callstack_async),

    registerCallstack = function (callstack, label) {
        var idx = _.findIndex(callstackRegistry, function (o) {
            return (_.difference(o.stack, callstack).length === _.difference(callstack, o.stack).length)
                && _.difference(o.stack, callstack).length === 0
                && o.label === label;
        });
        if (-1 === idx) {
            idx = callstackRegistry.length;
            callstackRegistry.push({
                stack: callstack,
                label: label
            });
        }
        return idx;
    },

    setConfigOption = function (options) {
        var newconf = _.defaults(options, config);
        newconf.logging = _.defaults(
            (options && options.logging) || {},
            config.logging
        );
        config = newconf;
    },

    debugMode = function () {
        config.logging.debug = true;
        config.debugMode = true;
    },

    getCallstack = function () {
        var e = new Error('dummy'),
            stack = _.map(_.rest(e.stack.replace(/^[^\(]+?[\n$]/gm, '')
            .replace(/^\s+at\s+/gm, '')
            .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
            .split('\n')), function (l) {
                return l.replace(/\s+.*$/, '');
            });
        return stack;
    },
    logCallstackSub = function (cs) {
        var matches, csa;
        _.find(cs, function (line) {
            matches = line.match(/TAS_CALLSTACK_(\d+)/);
            if (matches) {
                csa = callstackRegistry[matches[1]];
                logCSA('====================' + (csa.label ? '> ' + csa.label + ' <' : '') + '====================');
                logCallstackSub(csa.stack);
                return true;
            }
            logCS(line);
            return false;
        });
    },
    logCallstack = function () {
        var cs;
        if (config.debugMode) {
            cs = getCallstack();
            cs.shift();
            log('==============================> CALLSTACK <==============================');
            logCallstackSub(cs);
            log('=========================================================================');
        }
    },


    wrapCallback = function (label, callback, context) {
        var callstack;
        if ('function' === typeof label) {
            context = callback;
            callback = label;
            label = undefined;
        }
        if (!config.debugMode) {
            return (function (cb, ctx) {
                return function () {
                    cb.apply(ctx || {}, arguments);
                };
            }(callback, context));
        }

        callstack = getCallstack();
        callstack.shift();

        return (function (cb, ctx, cs, lbl) {
            var ctxref = registerCallstack(cs, lbl);
            return new Function('cb', 'ctx', 'TASlog',
                "return function TAS_CALLSTACK_" + ctxref + "(){" +
                    "TASlog('Entering: '+(cb.name||'(anonymous function)'));" +
                    "cb.apply(ctx||{},arguments);" +
                    "TASlog('Exiting: '+(cb.name||'(anonymous function)'));" +
                "};")(cb, ctx, log);
        }(callback, context, callstack, label));
    },


    prepareUpdate = function (attribute, value) {
        queuedUpdates[attribute] = value;
    },

    applyQueuedUpdates = function () {
        setAttrs(queuedUpdates);
        queuedUpdates = {};
    },

	namesFromArgs = function (args, base) {
	    return _.chain(args)
            .reduce(function (memo, attr) {
                if ('string' === typeof attr) {
                    memo.push(attr);
                } else if (_.isArray(args) || _.isArguments(args)) {
                    memo = namesFromArgs(attr, memo);
                }
                return memo;
            }, (_.isArray(base) && base) || [])
            .uniq()
            .value();
	},

	addId = function (obj, value) {
	    Object.defineProperty(obj, 'id', {
	        value: value,
	        writeable: false,
	        enumerable: false
	    });
	},

	addProp = function (obj, prop, value, fullname) {
	    (function () {
	        var pname = (_.contains(['S', 'F', 'I', 'D'], prop) ? '_' + prop : prop),
			    full_pname = fullname || prop,
                pvalue = value;

	        _.each(['S', 'I', 'F'], function (p) {
	            if (!_.has(obj, p)) {
	                Object.defineProperty(obj, p, {
	                    value: {},
	                    enumerable: false,
	                    readonly: true
	                });
	            }
	        });
	        if (!_.has(obj, 'D')) {
	            Object.defineProperty(obj, 'D', {
	                value: _.reduce(_.range(10), function (m, d) {
	                    Object.defineProperty(m, d, {
	                        value: {},
	                        enumerable: true,
	                        readonly: true
	                    });
	                    return m;
	                }, {}),
	                enumerable: false,
	                readonly: true
	            });
	        }


	        // Raw value
	        Object.defineProperty(obj, pname, {
	            enumerable: true,
	            set: function (v) {
	                pvalue = v;
	                prepareUpdate(full_pname, v);
	            },
	            get: function () {
	                return pvalue;
	            }
	        });

	        // string value
	        Object.defineProperty(obj.S, pname, {
	            enumerable: true,
	            set: function (v) {
	                var val = v.toString();
	                pvalue = val;
	                prepareUpdate(full_pname, val);
	            },
	            get: function () {
	                return pvalue.toString();
	            }
	        });

	        // int value
	        Object.defineProperty(obj.I, pname, {
	            enumerable: true,
	            set: function (v) {
	                var val = parseInt(v, 10) || 0;
	                pvalue = val;
	                prepareUpdate(full_pname, val);
	            },
	            get: function () {
	                return parseInt(pvalue, 10) || 0;
	            }
	        });

	        // float value
	        Object.defineProperty(obj.F, pname, {
	            enumerable: true,
	            set: function (v) {
	                var val = parseFloat(v) || 0;
	                pvalue = val;
	                prepareUpdate(full_pname, val);
	            },
	            get: function () {
	                return parseFloat(pvalue) || 0;
	            }
	        });
	        _.each(_.range(10), function (d) {
	            Object.defineProperty(obj.D[d], pname, {
	                enumerable: true,
	                set: function (v) {
	                    var val = (parseFloat(v) || 0).toFixed(d);
	                    pvalue = val;
	                    prepareUpdate(full_pname, val);
	                },
	                get: function () {
	                    return (parseFloat(pvalue) || 0).toFixed(d);
	                }
	            });
	        });

	    }());
	},

	repeating = function (section) {
	    return (function (s) {
	        var sectionName = s,
				attrNames = [],
				fieldNames = [],
				operations = [],
                after = [],

			repAttrs = function TAS_Repeating_Attrs() {
			    attrNames = namesFromArgs(arguments, attrNames);
			    return this;
			},
			repFields = function TAS_Repeating_Fields() {
			    fieldNames = namesFromArgs(arguments, fieldNames);
			    return this;
			},
			repReduce = function TAS_Repeating_Reduce(func, initial, final, context) {
			    operations.push({
			        type: 'reduce',
			        func: (func && _.isFunction(func) && func) || _.noop,
			        memo: (_.isUndefined(initial) && 0) || initial,
			        final: (final && _.isFunction(final) && final) || _.noop,
			        context: context || {}
			    });
			    return this;
			},
			repMap = function TAS_Repeating_Map(func, final, context) {
			    operations.push({
			        type: 'map',
			        func: (func && _.isFunction(func) && func) || _.noop,
			        final: (final && _.isFunction(final) && final) || _.noop,
			        context: context || {}
			    });
			    return this;
			},
            repEach = function TAS_Repeating_Each(func, final, context) {
                operations.push({
                    type: 'each',
                    func: (func && _.isFunction(func) && func) || _.noop,
                    final: (final && _.isFunction(final) && final) || _.noop,
                    context: context || {}
                });
                return this;
            },
            repTap = function TAS_Repeating_Tap(final, context) {
                operations.push({
                    type: 'tap',
                    final: (final && _.isFunction(final) && final) || _.noop,
                    context: context || {}
                });
                return this;
            },
            repAfter = function TAS_Repeating_After(callback, context) {
                after.push({
                    callback: (callback && _.isFunction(callback) && callback) || _.noop,
                    context: context || {}
                });
                return this;
            },
			repExecute = function TAS_Repeating_Execute(callback, context) {
			    var rowSet = {},
					attrSet = {},
					fieldIds = [],
					fullFieldNames = [];

			    repAfter(callback, context);

			    // call each operation per row.
			    // call each operation's final
			    getSectionIDs("repeating_" + sectionName, function (ids) {
			        fieldIds = ids;
			        fullFieldNames = _.reduce(fieldIds, function (memo, id) {
			            return memo.concat(_.map(fieldNames, function (name) {
			                return 'repeating_' + sectionName + '_' + id + '_' + name;
			            }));
			        }, []);
			        getAttrs(_.uniq(attrNames.concat(fullFieldNames)), function (values) {
			            _.each(attrNames, function (aname) {
			                if (values.hasOwnProperty(aname)) {
			                    addProp(attrSet, aname, values[aname]);
			                }
			            });

			            rowSet = _.reduce(fieldIds, function (memo, id) {
			                var r = {};
			                addId(r, id);
			                _.each(fieldNames, function (name) {
			                    var fn = 'repeating_' + sectionName + '_' + id + '_' + name;
			                    addProp(r, name, values[fn], fn);
			                });

			                memo[id] = r;

			                return memo;
			            }, {});

			            _.each(operations, function (op) {
			                var res;
			                switch (op.type) {
			                    case 'tap':
			                        _.bind(op.final, op.context, rowSet, attrSet)();
			                        break;

			                    case 'each':
			                        _.each(rowSet, function (r) {
			                            _.bind(op.func, op.context, r, attrSet, r.id, rowSet)();
			                        });
			                        _.bind(op.final, op.context, rowSet, attrSet)();
			                        break;

			                    case 'map':
			                        res = _.map(rowSet, function (r) {
			                            return _.bind(op.func, op.context, r, attrSet, r.id, rowSet)();
			                        });
			                        _.bind(op.final, op.context, res, rowSet, attrSet)();
			                        break;

			                    case 'reduce':
			                        res = op.memo;
			                        _.each(rowSet, function (r) {
			                            res = _.bind(op.func, op.context, res, r, attrSet, r.id, rowSet)();
			                        });
			                        _.bind(op.final, op.context, res, rowSet, attrSet)();
			                        break;
			                }
			            });

			            // finalize attrs
			            applyQueuedUpdates();
			            _.each(after, function (op) {
			                _.bind(op.callback, op.context)();
			            });
			        });
			    });
			};

	        return {
	            attrs: repAttrs,
	            attr: repAttrs,

	            column: repFields,
	            columns: repFields,
	            field: repFields,
	            fields: repFields,

	            reduce: repReduce,
	            inject: repReduce,
	            foldl: repReduce,

	            map: repMap,
	            collect: repMap,

	            each: repEach,
	            forEach: repEach,

	            tap: repTap,
	            'do': repTap,

	            after: repAfter,
	            last: repAfter,
	            done: repAfter,

	            execute: repExecute,
	            go: repExecute,
	            run: repExecute
	        };
	    }(section));
	},


    repeatingSimpleSum = function (section, field, destination) {
        repeating(section)
            .attr(destination)
            .field(field)
            .reduce(function (m, r) {
                return m + (r.F[field]);
            }, 0, function (t, r, a) {
                a[destination] = t;
            })
            .execute();
    };

    console.log('%c•.¸¸.•*´¨`*•.¸¸.•*´¨`*•.¸  The Aaron Sheet  v' + version + '  ¸.•*´¨`*•.¸¸.•*´¨`*•.¸¸.•', 'background: linear-gradient(to right,green,white,white,green); color:black;text-shadow: 0 0 8px white;');
    console.log('%c•.¸¸.•*´¨`*•.¸¸.•*´¨`*•.¸  Last update: ' + (new Date(lastUpdate * 1000)) + '  ¸.•*´¨`*•.¸¸.•*´¨`*•.¸¸.•', 'background: linear-gradient(to right,green,white,white,green); color:black;text-shadow: 0 0 8px white;');


    return {
        /* Repeating Sections */
        repeatingSimpleSum: repeatingSimpleSum,
        repeating: repeating,

        /* Configuration */
        config: setConfigOption,

        /* Debugging */
        callback: wrapCallback,
        callstack: logCallstack,
        debugMode: debugMode,
        _fn: wrapCallback,

        /* Logging */
        debug: logDebug,
        error: logError,
        warn: logWarn,
        info: logInfo,
        notice: logNotice,
        log: logLog
    };
}());

/* ---- END: TheAaronSheet.js ---- */
TAS.config({ logging: { debug: true } });
TAS.debugMode();


var ExExp = ExExp || (function () {

    parseExpression = function (s, until) {
        var untilCb = (typeof until === "function" ? until : function (tok) {
            return (tok == until);
        });

        // constants
        var ARG_COUNTS = { 'abs': 1, 'ceil': 1, 'floor': 1, 'round': 1, 'max': [1], 'min': [1] };
        var BINARY_PRECEDENCE = {
            '?': 1, ':': 2, '||': 3, '&&': 4, '|': 5, '^': 6
			, '&': 7, '=': 8, '==': 8, '!=': 8, '>=': 9, '>': 9
			, '<': 9, '<=': 9, '<<': 10, '>>': 10, '+': 11, '-': 11
			, '*': 12, '/': 12, '%': 12
			, '**': 14
			, 't': 98, 'd': 99
        };
        var UNARY_PRECEDENCE = {
            '!': 13
            , '~': 13
            , '-': 13
        };
        var CLOSERS = {
            '(': ")"
            , '{': "}"
        };

        // local variables
        var operators = [{ 'precedence': 0 }], operands = [];

        // helper functions
        function getToken(s) {
            if (!s) {
                return s;
            }

            var m;

            function retVal(tokType, matchObj) {
                return {
                    'type': tokType
                    , 'text': matchObj[0]
                    , 'match': matchObj
                };
            }

            m = s.match(/^\s+/);
            if (m) {
                return retVal("whitespace", m);
            }
            m = s.match(/^(abs|ceil|floor|round|max|min)[(]/);
            if (m) {
                return retVal("function", m);
            }
            m = s.match(/^[({]/);
            if (m) {
                return retVal("opengroup", m);
            }
            m = s.match(/^[)}]/);
            if (m) {
                return retVal("closegroup", m);
            }
            m = s.match(/^((\d+(\.\d+)?)|(\.\d+))/);
            if (m) {
                return retVal("number", m);
            }
            m = s.match(/^['"]/);
            if (m) {
                return retVal("quote", m);
            }
            m = s.match(/^((\|\|)|(&&)|(==)|(!=)|(>=)|(<=)|(<<)|(>>)|(\*\*)|[?:|^&=><%!~])/);
            if (m) {
                return retVal("extoperator", m);
            }
            m = s.match(/^[-+*/td]/);
            if (m) {
                return retVal("baseoperator", m);
            }
            m = s.match(/^\[([^\]]+)\]/);
            if (m) {
                return retVal("label", m);
            }
            m = s.match(/^\${([^'"($}][^}]*)}/);
            if (m) {
                return retVal("variable", m);
            }
            m = s.match(/^\${/);
            if (m) {
                return retVal("openvariable", m);
            }

            return {
                'type': "raw"
                , 'text': s.charAt(0)
            };
        }

        function popToken(state) {
            state.tok = getToken(state.s);
            if (state.tok) {
                state.s = state.s.substring(state.tok.text.length);
            }
            return state;
        }

        function popString(state, delim) {
            var i = -1
                , j = i;
            // find first index of delim not preceeded by an odd number of backslashes
            while (((i - j) & 1) === 0) {
                i = state.s.indexOf(delim, i + 1);
                if (i < 0) {
                    return;
                }
                j = i - 1;
                while ((j >= 0) && (state.s.charAt(j) === '\\')) {
                    j--;
                }
            }
            // unescape string to be returned
            function replaceEscapes(s) {
                return s.replace(/\\n/g, "\n")
                    .replace(/\\r/g, "\r")
                    .replace(/\\t/g, "\t")
                    .replace(/\\/g, "");
            }
            var retval = state.s.substring(0, i)
                .split("\\\\")
                .map(replaceEscapes)
                .join("\\");
            // point state delim, then pop off the delimiter token
            state.s = state.s.substring(i);
            popToken(state);
            return retval;
        }

        function popOperator() {
            var op = operators.pop();
            var right = operands.pop();
            if (op.unary) {
                operands.push({
                    'type': (op.type === "baseoperator" ? "unop" : "unopex")
                    , 'datatype': right.datatype
                    , 'operator': op.text
                    , 'operand': right
                });
                return;
            }
            var left = operands.pop();
            if (op.text !== ":") {
                var datatype;
                if (op.text === "d" || op.text === "t") {
                    datatype = "number";
                } else if (left.datatype === right.datatype) {
                    datatype = left.datatype;
                } else if ((left.datatype === "string") || (right.datatype === "string")) {
                    datatype = "string";
                }
                operands.push({
                    'type': (op.type === "baseoperator" ? "binop" : "binopex")
                    , 'datatype': datatype
                    , 'operator': op.text
                    , 'left': left
                    , 'right': right
                    , 'mods': op.mods
                    , 'label': op.label
                });
                return;
            }
            op = operators.pop();
            if (op.text !== "?") {
                return "Error: Expected ? but got " + op.text;
            }
            var cond = operands.pop();
            operands.push({
                'type': "cond"
                , 'cond': cond
                , 'left': left
                , 'right': right
                , 'datatype': (left.datatype === right.datatype ? left.datatype : undefined)
            });
        }

        function pushOperator(op) {
            var err;
            op.precedence = (op.unary ? UNARY_PRECEDENCE[op.text] : BINARY_PRECEDENCE[op.text]) || 0;
            while (operators[operators.length - 1].precedence >= op.precedence) {
                err = popOperator();
                if (err) {
                    return err;
                }
            }
            operators.push(op);
        }

        function argListUntil(tok) {
            return (tok === ',') || (tok === ')');
        }

        function parseHelper() {
            var err;

            popToken(s);
            if (!s.tok) {
                return "Error: Unrecognized token: " + s.s.split(" ", 1)[0];
            }
            while (s.tok.type === "whitespace") {
                popToken(s);
                if (!s.tok) {
                    return "Error: Unrecognized token: " + s.s.split(" ", 1)[0];
                }
            }
            switch (s.tok.type) {
                case "function":
                    var func = s.tok.match[1];
                    var argCounts = ARG_COUNTS[func]
                        , minArgs, maxArgs;
                    if (argCounts === undefined) {
                        return "Error: Unrecognized function: " + func;
                    }
                    if (Array.isArray(argCounts)) {
                        minArgs = argCounts[0];
                        maxArgs = argCounts[1];
                    } else {
                        minArgs = argCounts;
                        maxArgs = argCounts;
                    }
                    var args = [];
                    while ((s.tok) && (s.tok.text !== ')')) {
                        var argTree = parseExpression(s, argListUntil);
                        if (typeof (argTree) === "string") {
                            return argTree;
                        } // error
                        args.push(argTree);
                        if (!s.tok) {
                            return "Error: Unterminated function: " + func;
                        }
                        if (!argListUntil(s.tok.text)) {
                            return "Error: Expected ',' or ')' to continue/close '" + func + "(', but got '" + s.tok.text + "'";
                        }
                    }
                    if (minArgs < 0) {
                        minArgs = args.length;
                    }
                    if (isNaN(maxArgs) || maxArgs < 0) {
                        maxArgs = args.length;
                    }
                    if (args.length < minArgs) {
                        return "Error: Function '" + func + "' requires at least " + minArgs + " argument(s)";
                    }
                    if (args.length > maxArgs) {
                        return "Error: Function '" + func + "' requires at most " + maxArgs + " argument(s)";
                    }
                    operands.push({
                        'type': "function"
                        , 'datatype': "number"
                        , 'function': func
                        , 'args': args
                    });
                    return;
                case "number":
                    operands.push({
                        'type': "number"
                        , 'datatype': "number"
                        , 'value': parseFloat(s.tok.text)
                    });
                    return;
                case "variable":
                    operands.push({
                        'type': "variable"
                        , 'value': s.tok.match[1]
                    });
                    return;
                case "quote":
                    var str = popString(s, s.tok.text);
                    if (typeof (str) !== "string") {
                        return "Error: Unterminated string";
                    }
                    operands.push({
                        'type': "string"
                        , 'datatype': "string"
                        , 'value': str
                    });
                    return;
                case "opengroup":
                    var opener = s.tok.text
                        , closer = CLOSERS[opener];
                    var operand = parseExpression(s, closer);
                    if (typeof (operand) === "string") {
                        return operand;
                    } // error
                    operands.push(operand);
                    if (s.tok.text !== closer) {
                        return "Error: Expected '" + closer + "' to close '" + opener + "', but got '" + s.tok.text + "'";
                    }
                    return;
                case "openvariable":
                    var varExp = parseExpression(s, "}");
                    if (typeof (varExp) === "string") {
                        return varExp;
                    } // error
                    if (s.tok.text !== "}") {
                        return "Error: Expected '}' to close '${', but got '" + s.tok.text + "'";
                    }
                    operands.push({
                        'type': "variable"
                        , 'value': varExp
                    });
                    return;
                case "extoperator":
                case "baseoperator":
                    if (!UNARY_PRECEDENCE[s.tok.text]) {
                        return "Error: " + s.tok.text + " is not a unary operator";
                    }
                    s.tok.unary = true;
                    err = pushOperator(s.tok);
                    if (err) {
                        return err;
                    }
                    return parseHelper();
            }
            return "Error: Unrecognized token: " + s.tok.text + (s.tok.type === "raw" ? s.s.split(" ", 1)[0] : "");
        }

        // if we were given a string, construct a state object
        if (typeof (s) === "string") {
            s = {
                's': s
            };
        }

        // push operators and operands to their respective stacks, building sub-ASTs in the operand stack as needed
        var err = parseHelper();
        if (err) {
            return err;
        }
        for (popToken(s) ;
            (s.tok) && (!untilCb(s.tok.text)) && ((until) || (s.tok.type !== "raw")) ; popToken(s)) {
            switch (s.tok.type) {
                case "extoperator":
                case "baseoperator":
                    rollOperator = (s.tok.text === "d" ? s.tok : null);
                    err = pushOperator(s.tok);
                    if (err) {
                        return err;
                    }
                    if ((rollOperator) && (s.s.charAt(0) === 'F')) {
                        operands.push({
                            'type': "rollspec"
                            , 'value': "F"
                        })
                        s.s = s.s.substring(1);
                    } else if (s.tok.text === "t") {
                        if (s.s.charAt(0) !== '[') {
                            return "Error: 't' operator requires '[table]' argument";
                        }
                        var m = s.s.match(/^\[([^'"$(\]][^\]]*)\]/);
                        var tableExp;
                        if (m) {
                            tableExp = m[1];
                            s.s = s.s.substring(m[0].length);
                        } else {
                            s.s = s.s.substring(1);
                            tableExp = parseExpression(s, "]");
                            if (typeof (tableExp) === "string") {
                                return tableExp;
                            } // error
                            if (s.tok.text !== "]") {
                                return "Error: Expected ']' to close 't[', but got '" + s.tok.text + "'";
                            }
                        }
                        operands.push({
                            'type': "tablename"
                            , 'value': tableExp
                        });
                    } else {
                        err = parseHelper();
                        if (err) {
                            return err;
                        }
                    }
                    if (rollOperator) {
                        var m = s.s.match(/^[acdfhkloprs0-9<=>!]+/);
                        if (m) {
                            rollOperator.mods = m[0];
                            s.s = s.s.substring(m[0].length)
                        }
                    }
                    break;
                case "label":
                    if ((operators.length > 0) && (operators[operators.length - 1].text === "d")) {
                        // set label on "d" operator instead of operand (e.g. "1d6[foo]" is "(1d6)[foo]", not "1d(6[foo])")
                        operators[operators.length - 1].label = s.tok.match[1];
                        break;
                    }
                    var operand = operands.pop();
                    if (operand) {
                        operand.label = s.tok.match[1];
                        operands.push(operand);
                    }
                    break;
            }
        }
        // no more input; collapse remaining operators and operands into a single AST
        while (operators.length > 1) {
            err = popOperator();
            if (err) {
                return err;
            }
        }

        return operands.pop();
    },

    write = function (s) {
        console.log("EXEXP:" + s);
    },


    sendCommand = function (chunks, asts, evalResults, labels) {
        //infinite loop
        //TAS.log("at sendCommand");
        //TAS.log(chunks);TAS.log(asts); TAS.log(evalResults);TAS.log(labels);
        // constants
        var FUNCTION_FUNCTIONS = {
            'abs': Math.abs
            , 'ceil': Math.ceil
            , 'floor': Math.floor
            , 'round': Math.round
            , 'max': Math.max
            , 'min': Math.min
        };
        var BINARY_FUNCTIONS = {
            '||': function (x, y) {
                return x || y;
            }
            , '&&': function (x, y) {
                return x && y;
            }
            , '|': function (x, y) {
                return x | y;
            }
            , '^': function (x, y) {
                return x ^ y;
            }
            , '&': function (x, y) {
                return x & y;
            }
            , '=': function (x, y) {
                return x == y;
            }
            , '==': function (x, y) {
                return x == y;
            }
            , '!=': function (x, y) {
                return x != y;
            }
            , '>=': function (x, y) {
                return x >= y;
            }
            , '>': function (x, y) {
                return x > y;
            }
            , '<': function (x, y) {
                return x < y;
            }
            , '<=': function (x, y) {
                return x <= y;
            }
            , '<<': function (x, y) {
                return x << y;
            }
            , '>>': function (x, y) {
                return x >> y;
            }
            , '+': function (x, y) {
                return x + y;
            }
            , '-': function (x, y) {
                return x - y;
            }
            , '*': function (x, y) {
                return x * y;
            }
            , '/': function (x, y) {
                return x / y;
            }
            , '%': function (x, y) {
                return x % y;
            }
            , '**': Math.pow
            , 'd': function (x, y) {
                var retval = 0;
                for (var i = 0; i < x; i++) {
                    retval += randomInteger(y);
                }
                return retval;
            }
        };
        var UNARY_FUNCTIONS = {
            '!': function (x) {
                return !x;
            }
            , '~': function (x) {
                return ~x;
            }
            , '-': function (x) {
                return -x;
            }
        };


        // local variables
        var references = {}
            , unevalRefs = []
            , evalReqs = [];

        // helper functions
        function lazyEval(t, labels, references, unevalRefs, evalReqs, force) {
            //alert(' at lazyEval, t: ' + t + ', t.type:'+t.type);
            var x, y;

            if (t.label) {
                labels[t.label] = t;
            }

            switch (t.type) {
                case "number":
                case "rollspec":
                    t.baseValid = true;
                    // fall through
                case "string":
                    return t;
                case "tablename":
                    if (typeof (t.value) !== "string") {
                        x = lazyEval(t.value, labels, references, unevalRefs, evalReqs, true);
                        if (typeof (x) === "string") {
                            return x;
                        } // error
                        if (x.type === "number") {
                            // number node; coerce to string
                            x.value = "" + x.value;
                            x.type = "string"
                        }
                        if (x.type !== "string") {
                            // unable to fully evaluate table name
                            if (t.baseValid) {
                                t.baseValid = false;
                            }
                            unevalRefs.push(t.value);
                            return t;
                        }
                        // successfully evaluated table name
                        t.value = x.value;
                    }
                    // if we got here, t.value is the name of a rollable table
                    t.baseValid = true;
                    return t;
                case "function":
                    var args = [];
                    for (var i = 0; i < t.args.length; i++) {
                        x = lazyEval(t.args[i], labels, references, unevalRefs, evalReqs, true);
                        if (typeof (x) === "string") {
                            return x;
                        } // error
                        if (x.type === "string") {
                            x.value = parseFloat(x.value);
                            x.type = "number";
                        }
                        if (x.type !== "number") {
                            // unable to fully evaluate argument
                            if (t.baseValid) {
                                t.baseValid = false;
                            }
                            return t;
                        }
                        args.push(x.value);
                    }
                    // successfully evaluated all arguments
                    t.type = "number";
                    t.datatype = "number";
                    t.value = FUNCTION_FUNCTIONS[t.function].apply(args, args);
                    for (var i = 0; i < t.args.length; i++) {
                        if (t.args[i].label) {
                            labels[t.args[i].label] = t.args[i];
                        }
                    }
                    delete t.function;
                    delete t.args;
                    t.baseValid = true;
                    return t;
                case "unop":
                case "unopex":
                    force = force || (t.type !== "unop");
                    x = lazyEval(t.operand, labels, references, unevalRefs, evalReqs, force);
                    if (typeof (x) === "string") {
                        return x;
                    } // error
                    if (force) {
                        if (x.type !== "number") {
                            // unable to fully evaluate operand
                            if (t.baseValid) {
                                t.baseValid = false;
                            }
                            return t;
                        }
                        // successfully evaluated operand
                        t.type = "number";
                        t.datatype = "number";
                        t.value = UNARY_FUNCTIONS[t.operator](x.value);
                        delete t.operator;
                        if (t.operand.label) {
                            labels[t.operand.label] = x;
                        }
                        delete t.operand;
                        t.baseValid = true;
                    } else {
                        t.baseValid = x.baseValid;
                    }
                    return t;
                case "binop":
                case "binopex":
                    force = force || (t.type !== "binop") || (t.left.datatype === "string") || (t.right.datatype === "string");
                    var forceSubtrees = force || (t.operator === "d") || (t.operator === "t");
                    //alert('left is: ' + t.left + ', right is:' + t.right);
                    x = lazyEval(t.left, labels, references, unevalRefs, evalReqs, forceSubtrees);
                    y = lazyEval(t.right, labels, references, unevalRefs, evalReqs, forceSubtrees);
                    //    TAS.log("At binop the values are: x:"+x+", y:"+y);
                    //	TAS.log(x);
                    //	TAS.log(y);
                    force = true;
                    /*****************************************************/
                    if (typeof x === "string") {
                        //	TAS.log(x);
                        return x;
                    } // error
                    if (typeof y === "string") {
                        //	TAS.log(y);
                        return y;
                    } // error
                    /****************************************************/
                    if (force) {
                        if ((x.type !== "number") && (x.type !== "string")) {
                            // unable to fully evaluate left operand
                            if (t.baseValid) {
                                t.baseValid = false;
                            }
                            return t;
                        }
                        if ((y.type !== "number") && (y.type !== "string") && (y.type !== "rollspec") && (y.type !== "tablename")) {
                            // unable to fully evaluate right operand
                            if (t.baseValid) {
                                t.baseValid = false;
                            }
                            return t;
                        }
                        if ((y.type === "rollspec") && (t.operator !== "d")) {
                            return "Rollspec operand is only compatible with 'd' operator";
                        }
                        if ((t.operator === "t") && (y.type !== "tablename")) {
                            return "'t' operator requires tablename operand";
                        }
                        // successfully evaluated both operands
                        if ((t.operator === "t") || ((t.operator === "d") && (t.mods))) {
                            // operator is rollable table or is roll with mods; must submit to base system for evaluation
                            evalReqs.push(t);
                            return t;
                        }
                        //alert('about to call binary');
                        t.value = BINARY_FUNCTIONS[t.operator](x.value, y.value);
                        delete t.operator;
                        if (t.left.label) {
                            labels[t.left.label] = x;
                        }
                        delete t.left;
                        if (t.right.label) {
                            labels[t.right.label] = y;
                        }
                        delete t.right;
                        t.type = (typeof (t.value) === "string" ? "string" : "number");
                        t.datatype = t.type;
                        t.baseValid = (t.datatype === "number");
                    } else if ((x.datatype === "number") && (y.datatype === "number")) {
                        t.datatype = "number";
                        t.baseValid = true;
                    }
                    return t;
                case "cond":
                    x = lazyEval(t.cond, labels, references, unevalRefs, evalReqs, true);
                    if (typeof (x) === "string") {
                        return x;
                    } // error
                    if ((x.type !== "number") && (x.type !== "string")) {
                        // unable to fully evaluate condition
                        t.baseValid = false;
                        return t;
                    }
                    // successfully evaluated condition; replace t with t.left or t.right as appropriate
                    y = (x.value ? t.left : t.right);
                    if (t.cond.label) {
                        labels[t.cond.label] = x;
                    }
                    delete t.cond;
                    delete t.left;
                    delete t.right;


                    for (var k in y) {
                        t[k] = y[k];
                    }
                    return lazyEval(t, labels, references, unevalRefs, evalReqs, force);
                case "variable":
                    if (typeof (t.value) !== "string") {
                        x = lazyEval(t.value, labels, references, unevalRefs, evalReqs, true);
                        if (typeof (x) === "string") {
                            return x;
                        } // error
                        if (x.type === "number") {
                            // number node; coerce to string
                            x.value = "" + x.value;
                            x.type = "string"
                        }
                        if (x.type !== "string") {
                            // unable to fully evaluate variable name
                            if (t.baseValid) {
                                t.baseValid = false;
                            }
                            unevalRefs.push(t.value);
                            return t;
                        }
                        // successfully evaluated variable name
                        t.value = x.value;
                    }
                    // if we got here, t.value is the name of a variable
                    if ((labels[t.value]) && ((labels[t.value].type === "string") || (labels[t.value].type === "number"))) {
                        // variable exists and has been fully evaluated
                        t.type = labels[t.value].type;
                        t.datatype = labels[t.value].datatype;
                        t.baseValid = labels[t.value].baseValid;
                        t.value = labels[t.value].value;
                    } else {
                        // variable not yet defined or not yet fully evaluated
                        if (!references[t.value]) {
                            references[t.value] = [];
                        }
                        references[t.value].push(t);
                        if (t.baseValid) {
                            t.baseValid = false;
                        }
                    }
                    return t;
                default:
                    return "Unknown node type: " + t.type;
            }
        }

        function hasUnevaluatedLabels(t) {
            // base types: fully evaluated
            if ((t.type === "number") || (t.type === "string") || (t.type === "rollspec")) {
                return false;
            }

            // if we got here, node is unevaluated
            if (t.label) {
                return true;
            }

            // node has no label; check children
            switch (t.type) {
                case "function":
                    for (var i = 0; i < t.args.length; i++) {
                        if (hasUnevaluatedLabels(t.args[i])) {
                            return true;
                        }
                    }
                    return false;
                case "tablename":
                case "variable":
                    if (typeof (t.value) === "string") {
                        return false;
                    }
                    return hasUnevaluatedLabels(t.value);
                case "unop":
                case "unopex":
                    return hasUnevaluatedLabels(t.operand);
                case "cond":
                    if (hasUnevaluatedLabels(t.cond)) {
                        return true;
                    }
                    // fall through
                case "binop":
                case "binopex":
                    if (hasUnevaluatedLabels(t.left)) {
                        return true;
                    }
                    return hasUnevaluatedLabels(t.right);
            }
        }

        function flattenAST(t) {
            var retval;

            switch (t.type) {
                case "number":
                case "rollspec":
                    retval = t.value || 0;
                    break;
                case "tablename":
                    retval = "[" + t.value + "]";
                    break;
                case "unop":
                    retval = "(" + t.operator + flattenAST(t.operand) + ")";
                    break;
                case "binop":
                    retval = "(" + flattenAST(t.left) + t.operator + flattenAST(t.right) + (t.mods || "") + ")";
                    if ((t.label) && (t.operator === "d")) {
                        retval += "[" + t.label + "]";
                    }
                    break;
                default:
                    return "Unknown node type: " + t.type;
            }

            return retval;
        }

        function astToCmd(t) {
            if (t.type === "string") {
                return t.value;
            }
            var retval = flattenAST(t);
            return retval;
        }

        function reportError(err) {
            ExExp.write("Error: " + err);
            return "";
        }

        //BEGIN
        // substitute in results of base evaluation
        for (var i = 0; i < evalResults.length; i++) {
            var t = evalResults[i][0];
            delete t.operator;
            delete t.left;
            delete t.right;
            t.type = "number";
            t.datatype = "number";
            t.value = evalResults[i][1];
            t.baseValid = true;
        }

        // traverse ASTs, collapsing as much as possible
        for (var i = 0; i < asts.length; i++) {
            if (asts[i].baseValid) {
                continue;
            } // can be handled by base expression evaluator
            if ((asts[i].type === "string") || (asts[i].type === "number")) {
                continue;
            } // tree is fully evaluated
            var err = lazyEval(asts[i], labels, references, unevalRefs, evalReqs, false);
            if (typeof (err) === "string") {
                return reportError(err);
            }
        }

        // do variable substitution; repeat until we don't make any more progress
        var doSubstitution = true;
        while (doSubstitution) {
            doSubstitution = false;
            // substitute in values for variables for which we already have names

            for (var label in references) {
                if (!labels[label]) {
                    return reportError("Variable '" + label + "' not defined");
                }
                if ((labels[label].type !== "string") && (labels[label].type !== "number")) {
                    // variable exists but not yet evaluated; try to evaluate
                    var err = lazyEval(labels[label], labels, references, unevalRefs, evalReqs, true);
                    if (typeof (err) === "string") {
                        return reportError(err);
                    }
                }
                if ((labels[label].type === "string") || (labels[label].type === "number")) {
                    // variable fully evaluated; substitute it in
                    for (var i = 0; i < references[label].length; i++) {
                        references[label][i].type = labels[label].type;
                        references[label][i].datatype = labels[label].datatype;
                        references[label][i].value = labels[label].value;
                        references[label][i].baseValid = labels[label].baseValid;
                    }
                    delete references[label];
                    doSubstitution = true;
                }
            }

            // try to get names for variables and tables with unevaluated names
            var newUneval = [];
            while (unevalRefs.length > 0) {
                var r = lazyEval(unevalRefs.shift(), labels, references, unevalRefs, evalReqs, true);
                if (typeof (r) === "string") {
                    return reportError(err);
                }
                if ((r.type === "string") || (r.type === "number")) {
                    doSubstitution = true;
                } else {
                    newUneval.push(r);
                }
            }
            unevalRefs = newUneval;

        }

        // flatten fully evaluated ASTs into strings and splice into chunks
        for (var i = asts.length - 1; i >= 0; i--) {
            if ((!asts[i].baseValid) && (asts[i].type !== "number") && (asts[i].type !== "string")) {
                continue;
            }
            if ((unevalRefs.length > 0) & (hasUnevaluatedLabels(asts[i]))) {
                continue;
            }
            chunks.splice(i, 2, (chunks[i] || "") + astToCmd(asts.splice(i, 1)[0]) + (chunks[i + 1] || ""));
        }

        if (evalReqs.length > 0) {
            Console.log("Cannot evalutate");
            return "";
        }
        if (asts.length > 0) {
            // need to finish evaluating some ASTs; recurse directly
            return sendCommand(chunks, asts, [], labels)
        }
        // if we got here, we're done evaluating everything; submit results via sendChat
        var retval = chunks.join("");

        return retval;
    },


    handleExpression = function (msg) {
        var chunks = []
            , asts = []
            , cmd = msg.replace(/^\s+/, "");
        var state = {
            's': cmd
        };
        var ast;
        //TAS.log(msg);
        ast = parseExpression(state, null);
        //TAS.log(ast);
        if (typeof (ast) === "string") {
            ExExp.write("could not parse" + msg);
            return "";
        }
        asts.push(ast);
        state.s = (state.tok) ? (state.tok.text + state.s) : state.s;
        //  ((state.tok || {'text': ""}).text || "") + state.s;
        chunks.push(state.s);
        return sendCommand(chunks, asts, [], {});
    };


    return {
        write: write,
        handleExpression: handleExpression
    };
}());



var SWUtils = SWUtils || (function () {

    /*no macro calls, dropdowns, or keep  highest/lowest more than 1
    * currently support floor, abs, kh1, kl1 , also extended: ceil, round, max, min
    */
    var validNumericStr = function (preeval) {
        var anyIllegal = preeval.match(/\||\?|&|\{|\}|k[h,l][^1]/);
        if (anyIllegal) {
            return false;
        }

        anyIllegal = preeval.replace(/floor|ceil|round|abs|max|min|kh1|kl1/g, '');
        anyIllegal = anyIllegal.match(/[a-zA-Z]/);
        if (anyIllegal) {
            return false;
        }
        return true;
    },

    /* searchAndReplaceFields
     * Examines a string for instances of @{fieldname}, and then searches the sheet for those values
     * then replaces the instances in the string with the values of those fields.
     * Because it is a search and replace, if there are no @{fieldname} values, then it will return the same string back.
     * If there is an error, it will return an empty string "".
     *
     * @fromfield = string containing one or more @{fieldname}
     * @callback = method accepting 1 parameter , this parameter will be the result of the search and replace in the fromfield.
     * the end result should be evaluable to a number (not a macro string that is sent to chat)
     *   e.g.: replaces  [[ and ]] with ( and ) , ensures only kl1 or kh1 (not kh2 or more etc),
     *         no strings except valid functions like floor, ceil, etc, according to validNumericStr
     */
    searchAndReplaceFields = function (fromfield, callback) {
        if (typeof callback !== "function") {
            return;
        }
        if (!fromfield) {
            callback(null);
            return;
        }
        try {
            var i, numfields, fieldnames = [], matches = [];
            fromfield = fromfield.split("selected|").join("");
            fromfield = fromfield.split("target|").join("");

            matches = fromfield.match(/(@\{([^}]+)\})(?!.*\1)/g);
            if (!matches) {
                callback(fromfield);
                return;
            }
            numfields = matches.length;

            fieldnames = [numfields];
            for (i = 0; i < numfields; i++) {
                fieldnames[i] = matches[i].replace("@{", "").replace("}", "");
            }
            getAttrs(fieldnames, function (values) {
                var evalstr = fromfield, replacements = [numfields];
                try {
                    for (i = 0; i < numfields; i++) {
                        replacements[i] = values[fieldnames[i]];
                    }
                    for (i = 0; i < numfields; i++) {
                        //easier than escaping special regex and double escaping $
                        evalstr = evalstr.split(matches[i]).join(replacements[i]);

                    }
                } catch (err) {
                    console.log("ERROR:" + err);
                    evalstr = null;
                } finally {
                    callback(evalstr);
                }
            });
        } catch (err) {
            console.log("ERROR: " + err);
            callback(null);
        }
    },

    /* evaluateExpression
    *  reads in the string, evalutates it until we find a number, then passes that numbe to the callback.
    *  @exprStr= A string containing a mathematical expression, possibly containing references to fields such as @{myfield}
    *  @callback = a function taking one parameter, either a number or empty string .
    */
    evaluateExpression = function (exprStr, callback) {
        if (typeof callback !== "function") {
            return;
        }
        if (!exprStr) {
            callback("");
        }
        searchAndReplaceFields(exprStr, function (replacedStr) {
            var evaluated;
            console.log("search and replace of " + exprStr + " resulted in " + replacedStr);
            replacedStr = replacedStr.replace(/\s+/g, '').replace(/\[\[/g, "(").replace(/\]\]/g, ")");
            if (!isNaN(parseFloat(replacedStr)) && isFinite(replacedStr)) {
                evaluated = parseFloat(replacedStr);
                console.log("sending back " + evaluated);
                callback(evaluated);
            }
            if (!isNaN(evaluated)) { console.log("sending back " + evaluated); callback(evaluated); }
            else if (typeof replacedStr !== "undefined" && replacedStr !== null && validNumericStr(replacedStr)) {
                evaluated = ExExp.handleExpression(replacedStr);
                console.log("sending back " + evaluated);
                callback(evaluated);
            } else {
                console.log("ERROR: cannot evaluate this to number: " + exprStr);
                callback(null);
            }
        });
    },


    /* evaluateAndSetString
     * Searches the readField for any instances of @{field} and replaces them with a value
     * then writes the resulting string to the writeField.
     *
     * @readField = the field that contains the string to evaluate, like a field containing a macro
     * @writeField = the field to write the evaluated value of readField to
     * @ensureValidExpr = the field should POTENTIALLY be evalauable to a number, it does not have to finish the evaluation,
    */
    evaluateAndSetString = function (readField, writeField, ensureValidExpr) {
        if (!writeField || !readField) {
            return;
        }
        getAttrs([readField], ensureValidExpr, function (values) {
            searchAndReplaceFields(values[readField], function (replacedStr) {
                var setter = {};
                if (typeof replacedStr !== "undefined" && replacedStr !== null) {
                    setter[writeField] = replacedStr;
                    setAttrs(setter);
                }
            });
        });
    },

    /* evaluateAndSetNumber
    * Examines the string in readField, and tests to see if it is a number
    * if it's a number immediately write it to writeField.
    * if not, then replace any @{field} references with numbers, and then evaluate it
    * as a mathematical expression till we find a number.
    *
    * note this is NOT recursive, you can't point one field of
    *
    * @readField {string}= field to read containing string to parse
    * @writeField {string}= field to write to
    * @dontForceOnBlank {boolean}= False (default): if writeField is empty overwrite no matter what,
    *               True: if writeField empty, then write only if readField evaluates to other than defaultVal||0.
    * @defaultVal {number}= optional, default to set if we cannot evaluate the field. If none set to 0.
    *
    */
    evaluateAndSetNumber = function (readField, writeField, dontForceOnBlank, defaultVal) {
        //console.log("EEEE at evaluateAndSetNumber read:"+readField+", write:"+writeField+", dontforce:"+dontForceOnBlank+", default:"+defaultVal);
        getAttrs([readField, writeField], function (values) {
            //console.log(values);
            var setter = {}, forceUpdate,
                trueDefault = defaultVal || 0,
                currVal = parseFloat(values[writeField], 10),
                value = Number(values[readField]);
            //console.log("trueDefault:"+trueDefault+", currVal:"+currVal+", value:"+value+", isNaN:"+isNaN(currVal));

            if (typeof values[readField] === "undefined" || values[readField] === "" || values[readField] === null) {
                value = trueDefault;
                //console.log("PFSheet Warning: could not find readField "+ readField + " at evaluateAndSetNumber");
                //not warning, just not there if they never entered anything for it. so ignore and set to default
            }
            forceUpdate = isNaN(currVal) && !dontForceOnBlank;
            currVal = isNaN(currVal) ? trueDefault : currVal;

            if (!isNaN(value)) {
                //console.log("it was a number");
                if (forceUpdate || currVal !== value) {
                    setter[writeField] = value;
                    setAttrs(setter);
                }
            } else {
                //console.log("ok evaluate "+values[readField]);
                evaluateExpression(values[readField], function (value2) {
                    console.log("came back with " + value2 + ", is it NaN?:" + isNaN(value2));
                    //look for ( and ) at begining and end 

                    value2 = isNaN(value2) ? trueDefault : value2;
                    if (forceUpdate || currVal !== value2) {
                        setter[writeField] = value2;
                        setAttrs(setter);
                    }
                });
            }

        });
    },

	/* setAttributeNumber
	* use if you have to clone the fieldToUpdate name due to a loop that would be outside getAttrs
	*/
    setAttributeNumber = function (fieldToUpdate, newVal) {
        getAttrs([fieldToUpdate], function (v) {
            //console.log("setAttributeNumber setting with "+newVal);
            //console.log(v);
            var setter = {},
            val = parseInt(v[fieldToUpdate], 10);
            if (newVal !== val || isNaN(val)) {
                setter[fieldToUpdate] = newVal;
                setAttrs(setter);
            }
        });
    },


   /* copyStaticNumberFieldToRepeating
    * Copies a number from a field outside a repeating section to the fields inside a repeating section
    * For instance, if you have a field @{FOO} and when it is updated you want to update all field in
    * the repeating_bar section, and they are named repeating_bar_$X_foo_copy
    *   then you would call with parameters ("bar","foo","foo","_copy")
    *
    * @repeatingSection = sectioname without "repeating_"
    * @copyFromField = Field to copy from
    * @fieldToUpdatePartialName = the partial name (everything after repeating_<name>_$X_   except a postpended string )
    *       if this is null, then use the copyFromField (if you set the name to be the same with a postpended string at the end)
    * @postPend = a postpend string at the end of the fieldname in the repeating section , such as "-copy"
    */
    copyStaticNumberFieldToRepeating = function (repeatingSection, copyFromField, fieldToUpdatePartialName) {
        if (!fieldToUpdatePartialName) { fieldToUpdatePartialName = copyFromField + "-copy"; }
        getAttrs([copyFromField], function (attrs) {
            var val = parseInt(attrs[copyFromField], 10) || 0;
            getSectionIDs("repeating_" + repeatingSection, function (ids) {
                ids.forEach(function (id, index) {
                    setAttributeNumber("repeating_" + repeatingSection + "_" + id + "_" + fieldToUpdatePartialName, val);
                });
            });
        });
    },

   /* getReferencedAttributeValue
     * by passing the value of a dropdown that has string references to abilties,
     * this determines what ability / field it references, finds that field in
     * the sheet, and calls the callback function passing the value in.
     * If new dropdowns are made, ensure the fields referenced are in the
     * findAbilityInString method.
     *
     * @readField {string| = the attribute name of dropdown we are looking at
	 * @synchrousFindAttributeFunc {function} takes value of @readField and says what the lookup field is.
     * @callback {function} = a function that takes one integer parameter, which is the value the dropdown selection represents
     */
	getReferencedAttributeValue = function (readField, synchrousFindAttributeFunc, callback) {
	    if (!readField || typeof callback !== "function" || typeof synchrousFindAttributeFunc !== "function") {
	        return;
	    }
	    getAttrs([readField], function (values) {
	        var fieldToFind = values[readField], foundField;
	        if (typeof fieldToFind === "undefined" || fieldToFind === null) {
	            callback("");
	        } else if (fieldToFind === "0" || fieldToFind === 0 || fieldToFind.indexOf("0") === 0) {
	            //select = none
	            callback(0);
	        } else {
	            foundField = synchrousFindAttributeFunc(fieldToFind);
	            getAttrs([foundField], function (v) {
	                var valueOf = parseInt(v[foundField], 10) || 0;
	                callback(valueOf);
	            });
	        }
	    });
	},


    /* handleDropdown
     * Looks at a dropdown, evaluates the number the selected item refers to, and then
     * sets the writeFields with that number.
     *
     * @readField {string} = the dropdpown field
     * @writeFields {string or Array} = Fields to write the value to
	 * @synchrousFindAttributeFunc {function} takes value of @readField and says what the lookup field is.	 
     * @callback {function} =  (optional) if we need to update the field, call this function
     *         with the value we set as the only parameter.
     */
    handleDropdown = function (readField, writeFields, synchrousFindAttributeFunc, callback) {
        SWUtils.getReferencedAttributeValue(readField, synchrousFindAttributeFunc, function (valueOf) {
            if (typeof writeFields === "string") {
                getAttrs([writeFields], function (v) {
                    var currValue = parseInt(v[writeFields], 10), setter = {};
                    if (currValue !== valueOf || isNaN(writeFields)) {
                        setter[writeFields] = valueOf;
                        setAttrs(setter);
                        if (typeof callback === "function") {
                            callback(valueOf);
                        }
                    }
                });
            } else if (Array.isArray(writeFields)) {
                getAttrs(writeFields, function (v) {
                    var i = 0, setany = 0, setter = {};
                    for (i = 0; i < writeFields.length; i++) {
                        if (v[writeFields[i]] !== valueOf) {
                            setter[writeFields[i]] = valueOf;
                            setany++;
                        }
                    }
                    if (setany) {
                        setAttrs(setter);
                        if (typeof callback === "function") {
                            callback(valueOf);
                        }
                    }
                });
            }
        });
    };


    return {
        util: {
            validNumericStr: validNumericStr

        }
        , searchAndReplaceFields: searchAndReplaceFields
        , evaluateExpression: evaluateExpression
        , evaluateAndSetString: evaluateAndSetString
        , evaluateAndSetNumber: evaluateAndSetNumber
        , copyStaticNumberFieldToRepeating: copyStaticNumberFieldToRepeating
		, setAttributeNumber: setAttributeNumber
		, getReferencedAttributeValue: getReferencedAttributeValue
    };
}());


var PFSheet = PFSheet || (function () {

    var version = 0.31,
	pfDebug = false,

    //Utilities

    /* findAbilityInString
     * Looks at a string for instances of an ability modifier DEX-mod, etc and returns
     * the modifier it finds. If it finds none, it looks for the base ability
     * Note the order checked is the same as the order they traditionally appear in
     * STR-mod,DEX-mod,CON-mod,INT-mod,WIS-mod,CHA-mod
     * then it checks for  STR,DEX,CON,INT,WIS,CHA
     * if none is found, then if the first character is "0" return ""
     */
    findAbilityInString = function (fieldToFind) {
        if (!fieldToFind) { fieldToFind = ""; }
        else if (fieldToFind.indexOf("0") === 0) { fieldToFind = ""; }
        else if (fieldToFind.indexOf("STR-mod") >= 0) { fieldToFind = "STR-mod"; }
        else if (fieldToFind.indexOf("DEX-mod") >= 0) { fieldToFind = "DEX-mod"; }
        else if (fieldToFind.indexOf("CON-mod") >= 0) { fieldToFind = "CON-mod"; }
        else if (fieldToFind.indexOf("INT-mod") >= 0) { fieldToFind = "INT-mod"; }
        else if (fieldToFind.indexOf("WIS-mod") >= 0) { fieldToFind = "WIS-mod"; }
        else if (fieldToFind.indexOf("CHA-mod") >= 0) { fieldToFind = "CHA-mod"; }
        else if (fieldToFind.indexOf("melee") >= 0) { fieldToFind = "attk-melee"; }
        else if (fieldToFind.indexOf("Melee") >= 0) { fieldToFind = "attk-melee"; }
        else if (fieldToFind.indexOf("ranged") >= 0) { fieldToFind = "attk-ranged"; }
        else if (fieldToFind.indexOf("Ranged") >= 0) { fieldToFind = "attk-ranged"; }
        else if (fieldToFind.indexOf("CMB") >= 0) { fieldToFind = "CMB"; }
        else if (fieldToFind.indexOf("STR") >= 0) { fieldToFind = "STR"; }
        else if (fieldToFind.indexOf("DEX") >= 0) { fieldToFind = "DEX"; }
        else if (fieldToFind.indexOf("CON") >= 0) { fieldToFind = "CON"; }
        else if (fieldToFind.indexOf("INT") >= 0) { fieldToFind = "INT"; }
        else if (fieldToFind.indexOf("WIS") >= 0) { fieldToFind = "WIS"; }
        else if (fieldToFind.indexOf("CHA") >= 0) { fieldToFind = "CHA"; }
        return fieldToFind;
    },

    /* findMultiplier
     * for damage dropdown in attack items, look at string for dropdown
     * and return number
     *
     * @str = the value of the damage ability
     * @returns = a number indicating the multiplier for the ability mod
    */
    findMultiplier = function (str) {
        var retNum;
        if (!str) { return 0; }
        if (str.indexOf("1.5") >= 0) { retNum = 1.5; }
        else if (str.indexOf(".5") >= 0) { retNum = 0.5; }
        else if (str.indexOf("1/2") >= 0) { retNum = 0.5; }
        else if (str.indexOf("3/2") >= 0) { retNum = 1.5; }
        else if (str.indexOf("1 1/2") >= 0) { retNum = 1.5; }
        else if (str.indexOf("2") >= 0) { retNum = 2; }
        else { retNum = 1; }
        return retNum;
    },



    /* handleDropdown
     * Looks at a dropdown, evaluates the number the selected item refers to, and then
     * sets the writeFields with that number.
     *
     * @readField {string} = the dropdpown field
     * @writeFields {string or Array} = One string or an array of strings that are fields to write the value to
     * @callback {function} =  (optional) if we need to update the field, call this function
     *         with the value we set as 1st param,
     * 	 If writeField is a string not an Array, then set old value as 2nd param (could be NaN);
     */
    handleDropdown = function (readField, writeFields, callback) {
        SWUtils.getReferencedAttributeValue(readField, findAbilityInString, function (valueOf) {
            if (typeof writeFields === "string") {
                getAttrs([writeFields], function (v) {
                    var currValue = parseInt(v[writeFields], 10), setter = {};
                    if (currValue !== valueOf || isNaN(writeFields)) {
                        setter[writeFields] = valueOf;
                        setAttrs(setter);
                        if (typeof callback === "function") {
                            callback(valueOf, currValue);
                        }
                    }
                });
            } else if (Array.isArray(writeFields)) {
                getAttrs(writeFields, function (v) {
                    var i = 0, setany = 0, setter = {};
                    for (i = 0; i < writeFields.length; i++) {
                        if (v[writeFields[i]] !== valueOf) {
                            setter[writeFields[i]] = valueOf;
                            setany++;
                        }
                    }
                    if (setany) {
                        setAttrs(setter);
                        if (typeof callback === "function") {
                            callback(valueOf);
                        }
                    }
                });
            }
        });
    },

	/*handleNonFFDefenseDropdown
	*@ddField {string} = field for ability dropdown

	*@modField {string} = mod field containing value of ddField
	*@ffField {string} = field for correlated flat footed ability dropdown
	*@ffModField {string} = mod field containing value of ffField (to write to if modField is negative)
	*/
	handleNonFFDefenseDropdown = function (ddField, modField, ffField, ffModField) {
	    console.log("at handleNonFFDefenseDropdown");
	    handleDropdown(ddField, modField, function (dexmod, oldmod) {
	        var setter = {};

	        if (dexmod < 0) {
	            setter[ffModField] = dexmod;
	            setAttrs(setter);
	        } else if (oldmod < 0) {
	            //if it changes from negative to 0 or  positive then reset flat footed - this may result in it being called twice but meh.
	            handleDropdown(ffField, ffModField);
	        }
	    });
	},

	/*handleDefenseDropdown
	*/
	handleDefenseDropdown = function (ability) {
	    console.log("at handleDefenseDropdown:" + ability);
	    switch (ability) {
	        case "CMD-ability1":
	        case "cmd-ability1":
	            handleDropdown("CMD-ability1", ["CMD-STR"]);
	            break;
	        case "AC-ability":
	        case "ac-ability":
	            handleNonFFDefenseDropdown("AC-ability", "AC-ability-mod", "FF-ability", "FF-DEX");
	            break;
	        case "CMD-ability2":
	        case "cmd-ability2":
	            handleNonFFDefenseDropdown("CMD-ability2", "CMD-DEX", "CMD-ability", "FF-CMD-DEX");
	            break;
	        case "FF-ability":
	        case "ff-ability":
	            handleDropdown("FF-ability", ["FF-DEX"]);
	            break;
	        case "CMD-ability":
	        case "cmd-ability":
	            handleDropdown("CMD-ability", ["FF-CMD-DEX"]);
	            break;
	    }
	},

    /* updateRowTotal
	* Adds up numbers and puts it in the first field of the fields array.
	* All numbers are added up as FLOATS, and then FLOOR is used to round the sum down
    * @fields {Array}= array of field names, first element (fields[0]) MUST be the total field , rest are the fields to add up.
    * Updates total field if the total is not the same as the number in the total, or if the current value is not a number.
    * @bonus {number} = a number that is added
    * @penalties {Array} = array of fieldnames to be subtracted from the total.
    */
    updateRowTotal = function (fields, bonus, penalties) {
        var readFields = fields;
        if (!fields || fields.length === 0) { return; }
        if (penalties && penalties.length > 0) {
            readFields = readFields.concat(penalties);
        }
        getAttrs(readFields, function (v) {
            var currValue = parseInt(v[fields[0]], 10),
            newValue = 0, penalty = 0, setter = {}, i;
            for (i = 1; i < fields.length; i++) {
                newValue += parseFloat(v[fields[i]]) || 0;
            }
            if (bonus && !isNaN(bonus)) { newValue += bonus; }
            if (penalties) {
                for (i = 0; i < penalties.length; i++) {
                    penalty += parseFloat(v[penalties[i]]) || 0;
                }
                newValue -= penalty;
            }
            newValue = Math.floor(newValue);
            if (isNaN(currValue) || currValue !== newValue) {
                setter[fields[0]] = newValue;
                setAttrs(setter);
            }
        });
    },

	/* if id is not empty, then returns the ID with an underscore on the right.
	*/
    getRepeatingIDStr = function (id) {
        var idStr = "";
        if (id) { idStr = id + "_"; }
        return idStr;
    },

	isBadRowId = function (section, id, nullok) {
	    //console.log("TRACE: isBadRowId section:"+section+", id:"+id+", null ok?:" + nullok);
	    if (!nullok && !id) {
	        return true;
	    }
	    if (id === section) {
	        return true;
	    }
	    if (section === "weapon") {
	        if (id && (id.indexOf("attack") >= 0 || id.indexOf("damage") >= 0)) {
	            return true;
	        }
	    }
	    return false;
	},

    setRepeatingRowDefaultFields = function (section, id, forceReset) {
        var newflag = "repeating_" + section + "_" + id + "_new_flag",
        rowid = "repeating_" + section + "_" + id + "_row_id",
        fieldNames = [newflag, rowid];
        getAttrs(fieldNames, function (v) {
            var setter = {};
            if (v[newflag] != "1" || forceReset) {
                setter[rowid] = id;
                setter[newflag] = "1";
                setAttrs(setter);
            }
        });
    },
    handleRepeatingRowOrdering = function (section, forceReset) {
        getSectionIDs("repeating_" + section, function (ids) {
            ids.forEach(function (id, index) {
                if (isBadRowId(section, id, false)) {
                    console.log("ERROR: handleRepeatingRowOrdering invalid id:" + id);
                    return;
                }
                setRepeatingRowDefaultFields(section, id, forceReset);
            });
        });
    },


    /*updateSize
    * When size attribute is changed, update CMD-size, size_display, size_skill, size_skill_double
    */
    updateSize = function () {
        getAttrs(["size"], function (v) {
            var size = parseInt(v.size, 10) || 0,
            skillSize, cmbsize, doubleSkill;
            switch (Math.abs(size)) {
                case 0: skillSize = 0; break;
                case 1: skillSize = 2; break;
                case 2: skillSize = 4; break;
                case 4: skillSize = 6; break;
                case 8: skillSize = 8; break;
                case 16: skillSize = 10; break;
                default: skillSize = 0;
            }
            if (size < 0) { skillSize = skillSize * -1; }
            cmbsize = size * -1;
            doubleSkill = 2 * skillSize;
            setAttrs({ "size_display": size, "size_skill": skillSize, "CMD-size": cmbsize, "size_skill_double": doubleSkill });
        });
    },


    /* updateAbility
	 * Updates the final ability score, ability modifier, condition column based on entries in ability grid plus conditions and buffs.
	 * Also sets unconscious flag if ability damage is >= ability score.
	 * Note: Ability value is not affected by damage and penalties, instead only modifier is affected.
     * @ability {string} 3 letter abbreviation for one of the 6 ability scores.
     */
    updateAbility = function (ability, columnUpdated, columnVal) {
        getAttrs([ability + "-base", ability + "-enhance", ability + "-misc", ability + "-damage", ability + "-penalty"
			, ability + "-drain", ability, ability + "-mod", ability + "-cond", "buff_" + ability + "-total"], function (values) {
			    var base = (parseInt(values[ability + "-base"], 10) || 0) +
                        (parseInt(values[ability + "-enhance"], 10) || 0) +
                        (parseInt(values[ability + "-misc"], 10) || 0) +
                        (parseInt(values[ability + "-drain"], 10) || 0) +
                        (columnUpdated === "buff" ? columnVal : (parseInt(values["buff_" + ability + "-total"], 10) || 0))
                    , dmg = Math.floor(Math.abs(parseInt(values[ability + "-damage"], 10) || 0) / 2)
                    , pen = Math.floor(Math.abs(parseInt(values[ability + "-penalty"], 10) || 0) / 2)
                    , cond = (columnUpdated === "cond" ? columnVal : (Math.floor(Math.abs(parseInt(values[ability + "-cond"], 10) || 0) / 2)))
                    //use 99 (never happen) to make sure we update if there's a problem
                    , currAbility = parseInt(values[ability], 10) || 99
                    , currMod = parseInt(values[ability + "-mod"], 10) || 99
                    , mod = Math.floor((base - 10) / 2) - dmg - pen - cond
                    , setAny = 0, setter = {};


			    if (currAbility !== base) { setter[ability] = base; setAny = 1; }
			    if (currMod !== mod) { setter[ability + "-mod"] = mod; setAny = 1; }

			    if (setAny) { setAttrs(setter); }
			});
    },



    /* updateConditionAbilityPenalty
    * Sets DEX-cond and STR-cond for fatigued, entangled, and grappled
    */
    updateConditionAbilityPenalty = function () {
        getAttrs(["STR-cond", "DEX-cond", "condition-Fatigued", "condition-Entangled", "condition-Grappled"], function (v) {
            var setter = {}, setAny = 0
            , strMod = (parseInt(v["condition-Fatigued"], 10) || 0)
            , dexMod = (parseInt(v["condition-Entangled"], 10) || 0) +
                       (parseInt(v["condition-Grappled"], 10) || 0) + strMod
			, dexAbMod = dexMod * -2
			, strAbMod = strMod * -2;
            if (dexAbMod !== (parseInt(v["DEX-cond"], 10) || 0)) {
                setter["DEX-cond"] = dexAbMod;
                setAny = 1;
            }
            if (strAbMod !== (parseInt(v["STR-cond"], 10) || 0)) {
                setter["STR-cond"] = strAbMod;
                setAny = 1;
            }
            if (setAny) {
                setAttrs(setter);
                //short circuit 
                updateAbility("DEX", "cond", dexMod);
                updateAbility("STR", "cond", strMod);
            }
        });
    },


    /* updateBuff
     * This updates the buff value when a textbox is updated.
     * ONLY called if the toggle checkbox is CHECKED for this row,
     * so set buff even if 0 since it changed from non zero
     * @buffname {string} The case sensitive distinct portion of name of field that was changed.
     *      So: Melee, Ranged, DMG, AC, HP-temp, Fort, Ref, Will, STR, DEX, CON, INT, WIS, CHA
     * @row {number} The row number of the change.
     */
    updateBuff = function (buffname, row) {
        var fieldtoUpdate = "buff" + row + "_" + buffname
        , fieldtoRead = fieldtoUpdate + "_macro-text";
        SWUtils.evaluateAndSetNumber(fieldtoRead, fieldtoUpdate);
    },

    /* updateBuffRow
     * Updates the buff values for a given row of the buff array when the toggle checkbox is clicked on.
     * If toggled off, then sets all to zero.  If toggled on, then sets non-zero buffs to proper value.
     *
     * @row {number} The buff row toggled (X in buffX_Toggle )
      */
    updateBuffRow = function (row) {
        var toggle = "buff" + row + "_Toggle"
        , buffFlds = ["buff" + row + "_Melee", "buff" + row + "_Ranged", "buff" + row + "_DMG", "buff" + row + "_AC", "buff" + row + "_HP-temp", "buff" + row + "_Fort",
        "buff" + row + "_Ref", "buff" + row + "_Will", "buff" + row + "_STR", "buff" + row + "_DEX", "buff" + row + "_CON", "buff" + row + "_INT", "buff" + row + "_WIS", "buff" + row + "_CHA",
        "buff" + row + "_Touch", "buff" + row + "_CMD", "buff" + row + "_Check", "buff" + row + "_CasterLevel",
        toggle];

        getAttrs(buffFlds, function (v) {
            var numFlds = buffFlds.length - 1; // -1 to skip toggle field at end of buffFlds array
            var i, numSet = 0, valuesToSet = {};
            if (v[toggle] == "0") {
                for (i = 0; i < numFlds; i++) {
                    if (v[buffFlds[i]] !== 0) { valuesToSet[buffFlds[i]] = 0; numSet++; }
                }
                if (numSet > 0) { setAttrs(valuesToSet); }
            } else {
                var inputFlds = [numFlds];
                for (i = 0; i < numFlds; i++) {
                    inputFlds[i] = buffFlds[i] + "_macro-text";
                }
                for (i = 0; i < numFlds; i++) {
                    SWUtils.evaluateAndSetNumber(inputFlds[i], buffFlds[i], true);
                }
            }
        });
    },


    /* updateBuffColumn
     * Updates the buff_***-total field for the column in the buff array.
     * we know buffx_col will not be strings, unlike the _macro-text so just check for null not for isNaN
     * @col {string} the case sensitive distinct portion of name of field.
     *      So: Melee, Ranged, DMG, AC, HP-temp, Fort, Ref, Will, STR, DEX, CON, INT, WIS, CHA
     */
    updateBuffColumn = function (col) {
        var fields = ["buff_" + col + "-total", "buff1_" + col, "buff2_" + col, "buff3_" + col, "buff4_" + col, "buff5_" + col,
            "buff6_" + col, "buff7_" + col, "buff8_" + col, "buff9_" + col, "buff10_" + col];
        //updateRowTotal(fields);
        getAttrs(fields, function (v) {
            var currValue = parseInt(v[fields[0]], 10)
				, newValue = 0, setter = {}, i = 1;
            for (i = 1; i < 11; i++) {
                //console.log("at"+i);
                newValue += parseFloat(v[fields[i]]) || 0;
                //console.log("i:"+i+", val="+newValue);
            }
            if (isNaN(currValue) || currValue !== newValue) {
                setter[fields[0]] = newValue;
                setAttrs(setter);
                switch (col) {
                    case "STR":
                    case "DEX":
                    case "CON":
                    case "INT":
                    case "WIS":
                    case "CHA":
                        updateAbility(col, "buff", newValue);
                        break;
                        //cannot do this in case the user hit "update row total"
                        //then two or more could be updated, which breaks the repeating sections
                        //case "Melee":
                        //	updateAttack("melee",true,newValue);
                        //	updateAttack("CMB",true,newValue);
                        //	break;
                        //case "Ranged":
                        //	updateAttack("ranged",true,newValue);
                        //	break;
                }
            }
        });
    },


    /* updateGrapple
    * Ensures Grapple and Pin are mutually exclusive
    */
    updateGrapple = function () {
        getAttrs(["condition-Pinned", "condition-Grappled"], function (values) {
            if (values["condition-Pinned"] !== "0" && values["condition-Grappled"] !== "0") {
                setAttrs({ "condition-Pinned": "0" });
            } else {
                //user hit either pinned and it undid grapple, or hit grapple first time.
                updateConditionAbilityPenalty();
            }
        });
    },

    /* updatePin
    * Ensures Grapple and Pin are mutually exclusive
    */
    updatePin = function () {
        getAttrs(["condition-Pinned", "condition-Grappled"], function (values) {
            if (values["condition-Pinned"] !== "0" && values["condition-Grappled"] !== "0") {
                setAttrs({ "condition-Grappled": "0" });
            } else {
                //user hit grapple and it  undid pinned, or hit pinned first time.
                updateConditionAbilityPenalty();
            }
        });
    },

    /* updateInit
     * updates the init
     */
    updateInit = function () {
        updateRowTotal(["init", "init-ability-mod", "init-trait", "init-misc"], 0, ["condition-Deafened"]);
    },


    /* updateHP
     * sets max HP
     */
    updateHP = function () {
        getAttrs(["HP_max", "HP-ability-mod", "level", "total-hp", "total-mythic-hp", "condition-Drained", "HP-formula-mod", "HP-misc", "mythic-adventures-show"], function (values) {
            var totalhp = ((parseInt(values["HP-ability-mod"], 10) || 0) * (parseInt(values["level"], 10) || 0)) +
                 (parseInt(values["total-hp"], 10) || 0) +
        		 (parseInt(values["HP-misc"], 10) || 0) +
                 (parseInt(values["HP-formula-mod"], 10) || 0) +
                 (5 * (parseInt(values["condition-Drained"], 10) || 0));
            if (values["mythic-adventures-show"] == "1") {
                totalhp += (parseInt(values["total-mythic-hp"], 10) || 0);
            }
            var grazedhp = Math.floor(totalhp * 0.75),
                woundedhp = Math.floor(totalhp / 2),
                criticalhp = Math.floor(totalhp / 4);
            var currHP = parseInt(values["HP_max"], 10) || 0;
            if (currHP !== totalhp) {
                setAttrs({ "HP_max": totalhp, "HP_grazed": grazedhp, "HP_wounded": woundedhp, "HP_critical": criticalhp });
            }
        });
    },

    /* updateTempHP
     * sets temp hp
     */
    updateTempHP = function () {
        getAttrs(["HP-temp", "HP-temp-misc", "buff_HP-temp-total"], function (values) {
            var totaltemp = (parseInt(values["HP-temp-misc"], 10) || 0) + (parseInt(values["buff_HP-temp-total"], 10) || 0),
               currtemp = parseInt(values["HP-temp"], 10) || 0;
            if (currtemp !== totaltemp) { setAttrs({ "HP-temp": totaltemp }); }
        });
    },

    /* updateClassInformation
     * Updates totals at bottom of Class Information grid
     *
     * @col the unique part of the string for the cell modified:
     *   hp, fchp, bab, skill, fcskill, alt, Fort, Ref, Will, level
     */
    updateClassInformation = function (col) {
        //console.log("at updateClassInformation");
        if (!col) { return; }
        if (col === "fchp") { col = "hp"; }
        var getFields = [], totalColName,
            col0Name = "class-0-" + col, col1Name = "class-1-" + col, col2Name = "class-2-" + col
            , col3Name = "class-3-" + col, col4Name = "class-4-" + col, col5Name = "class-5-" + col
            , col0NameTwo, col1NameTwo, col2NameTwo, col3NameTwo, col4NameTwo, col5NameTwo;
        totalColName = (col === "bab" || col === "level") ? col : "total-" + col;
        getFields = [totalColName, col0Name, col1Name, col2Name, col3Name, col4Name];
        if (col !== "skill") {
            if (col === "hp") {
                col0NameTwo = "class-0-fc" + col;
                col1NameTwo = "class-1-fc" + col;
                col2NameTwo = "class-2-fc" + col;
                col3NameTwo = "class-3-fc" + col;
                col4NameTwo = "class-4-fc" + col;
                col5NameTwo = "class-5-fc" + col;
                getFields = getFields.concat([col0NameTwo, col1NameTwo, col2NameTwo, col3NameTwo, col4NameTwo, col5NameTwo]);
            }
            //console.log(getFields);
            updateRowTotal(getFields);
        } else {
            col0NameTwo = "class-0-level";
            col1NameTwo = "class-1-level";
            col2NameTwo = "class-2-level";
            col3NameTwo = "class-3-level";
            col4NameTwo = "class-4-level";
            col5NameTwo = "class-5-level";
            getFields = getFields.concat([col0NameTwo, col1NameTwo, col2NameTwo, col3NameTwo, col4NameTwo, col5NameTwo]);
            //console.log(getFields);
            getAttrs(getFields, function (v) {
                var setter = {}, currTot,
                tot = Math.floor((parseFloat(v[col0Name], 10) || 0) * (parseInt(v[col0NameTwo], 10) || 0) +
                        (parseFloat(v[col1Name], 10) || 0) * (parseInt(v[col1NameTwo], 10) || 0) +
                        (parseFloat(v[col2Name], 10) || 0) * (parseInt(v[col2NameTwo], 10) || 0) +
                        (parseFloat(v[col3Name], 10) || 0) * (parseInt(v[col3NameTwo], 10) || 0) +
                        (parseFloat(v[col4Name], 10) || 0) * (parseInt(v[col4NameTwo], 10) || 0) +
                        (parseFloat(v[col5Name], 10) || 0) * (parseInt(v[col5NameTwo], 10) || 0));
                currTot = parseInt(v[totalColName], 10);
                //console.log("tot is "+tot+", currtot = "+currTot);
                if (isNaN(currTot) || tot !== currTot) {
                    setter[totalColName] = tot;
                    setAttrs(setter);
                }
            });
        }
    },

    /* updateMythicPathInformation
    * Updates total at bottom of Mythic Path Information grid
    */
    updateMythicPathInformation = function () {
        getAttrs(["mythic-0-tier", "mythic-0-hp", "total-mythic-hp"], function (values) {
            var tot = (parseInt(values["mythic-0-tier"], 10) || 0) * (parseInt(values["mythic-0-hp"], 10) || 0),
            currTot = parseInt(values["total-mythic-hp"], 10) || 0;
            //console.log("tot=" + tot + ", currTot=" + currTot);
            if (currTot !== tot) { setAttrs({ "total-mythic-hp": tot }); }
        });
    },

    /* updateMythicPower
    * sets max MP
    */
    updateMythicPower = function () {
        //console.log("entered updateMythicPower");
        getAttrs(["mythic-power_max", "tier-mythic-power", "misc-mythic-power"], function (values) {
            var totalMP = (parseInt(values["tier-mythic-power"], 10) || 0) + (parseInt(values["misc-mythic-power"], 10) || 0),
            currMP = parseInt(values["mythic-power_max"], 10) || 0;
            //console.log("totalMP=" + totalMP + ", currMP=" + currMP);
            if (currMP !== totalMP) { setAttrs({ "mythic-power_max": totalMP }); }
        });
    },

    /* updateTierMythicPower
    * sets tier mp
    */
    updateTierMythicPower = function () {
        //console.log("entered updateTierMythicPower");
        getAttrs(["tier-mythic-power", "mythic-0-tier"], function (values) {
            var totalTier = 3 + 2 * (parseInt(values["mythic-0-tier"], 10) || 0),
            curr = parseInt(values["tier-mythic-power"], 10) || 0;
            //console.log("totalTier=" + totalTier + ", curr=" + curr);
            if (curr !== totalTier) { setAttrs({ "tier-mythic-power": totalTier }); }
        });
    },

    /*updateConditionDefensePenalty
    * Updates the AC-penalty and CMD-penalty field based on conditions
	*only difference is CMD penalty affected by energy drain for some reason
    */
    updateConditionDefensePenalty = function (eventInfo) {
        if (!(eventInfo && eventInfo.sourceAttribute === "condition-Drained")) {
            updateRowTotal(["AC-penalty"], 0, ["condition-Blinded", "condition-Cowering", "condition-Stunned"
			, "condition-Flat-Footed", "condition-Pinned", "condition-Wounds"]);
        }
        updateRowTotal(["CMD-penalty", "condition-Drained"], 0, ["condition-Blinded", "condition-Cowering", "condition-Stunned"
        , "condition-Flat-Footed", "condition-Pinned", "condition-Wounds"]);
    },


    /* updateDefenses
     * updates the top grid of AC, Touch AC, Flat Footed AC, CMD, Flat Footed CMD
     * http://paizo.com/pathfinderRPG/prd/coreRulebook/combat.html#combat-maneuver-defense
     * A creature can also add any circumstance, deflection, dodge, insight, luck, morale, profane, and sacred bonuses to AC to its CMD.
     * Any penalties to a creature's AC also apply to its CMD
     *
      */
    updateDefenses = function (eventInfo) {
        getAttrs(["condition-Flat-Footed", "AC-ability-mod", "FF-DEX", "AC-penalty", "CMD-penalty", "size", "max-dex",
            "AC-dodge", "AC-natural", "AC-deflect", "AC-misc", "buff_AC-total", "buff_Touch-total", "buff_CMD-total",
            "CMD-DEX", "FF-CMD-DEX", "CMD-STR", "bab", "CMD-misc",
            "AC", "Touch", "Flat-Footed", "CMD", "FF-CMD", "AC-ability", "AC-armor", "AC-shield",
			"condition-Blinded", "condition-Pinned", "condition-Stunned", "condition-Cowering", "condition-Drained"], function (v) {
			    //console.log("AAAAAAAAAAAAt update defenses");
			    //console.log(v);
			    var setter = {}, setAny = 0,
                    size = parseInt(v["size"], 10) || 0,
                    dodge = parseInt(v["AC-dodge"], 10) || 0,
                    deflect = parseInt(v["AC-deflect"], 10) || 0,
                    miscAC = parseInt(v["AC-misc"], 10) || 0,
                    condPenalty = parseInt(v["AC-penalty"], 10) || 0,
                    buffs = parseInt(v["buff_AC-total"], 10) || 0,
                    buffsTouch = parseInt(v["buff_Touch-total"], 10) || 0,
                    buffsCMD = parseInt(v["buff_CMD-total"], 10) || 0,
                    armor = parseInt(v["AC-armor"], 10) || 0,
                    shield = parseInt(v["AC-shield"], 10) || 0,
                    natural = parseInt(v["AC-natural"], 10) || 0,
                    bab = parseInt(v["bab"], 10) || 0,
                    miscCMD = parseInt(v["CMD-misc"], 10) || 0,
                    maxDex = parseInt(v["max-dex"], 10),
                    ability = parseInt(v["AC-ability-mod"], 10) || 0,
                    ffAbility = parseInt(v["FF-DEX"], 10) || 0,
                    cmdAbility1 = parseInt(v["CMD-STR"], 10) || 0,
                    cmdAbility2 = parseInt(v["CMD-DEX"], 10) || 0,
                    cmdFFAbility2 = parseInt(v["FF-CMD-DEX"], 10) || 0,
                    cmdPenalty = (parseInt(v["CMD-penalty"], 10) || 0),
                    blinded = (parseInt(v["condition-Blinded"], 10) || 0) ? 1 : 0,
                    pinned = (parseInt(v["condition-Pinned"], 10) || 0) ? 1 : 0,
                    stunned = (parseInt(v["condition-Stunned"], 10) || 0) ? 1 : 0,
                    ffed = (parseInt(v["condition-Flat-Footed"], 10) || 0) ? 1 : 0,
                    cowering = (parseInt(v["condition-Cowering"], 10) || 0) ? 1 : 0,
                    loseDex = 0;

			    //console.log("DDDDDDDDDD updateDefenses size:"+size+", dodge:"+dodge+", misc:"+miscAC+", def:"+deflect+", cond:"+condPenalty+", buff:"+buffs+", armor:"+armor+", shield:"+shield+
			    //  ", natural:"+natural+", bab:"+bab+", miscCMD:"+miscCMD+", maxDex:"+maxDex+", stunned:"+stunned+", ffed:"+ffed+", ability:"+ability+
			    //  ", ffAbility:"+ffAbility+", cmdAbility1:"+cmdAbility1+",cmdAbility2:"+cmdAbility2+", cmdFFAbility2:"+cmdFFAbility2
			    //  + ", blinded: "+blinded+", pinned:"+pinned +", cowering:"+cowering  );

			    maxDex = isNaN(maxDex) ? 99 : maxDex; //cannot do "||0" since 0 is valid but falsy

			    if (findAbilityInString(v["AC-ability"]) === "DEX-mod" && maxDex < 99 && maxDex >= 0) {
			        ability = Math.min(ability, maxDex);
			        ffAbility = Math.min(ffAbility, maxDex);
			    }

			    //lose Dex: you lose your bonus but are not flat footed
			    //Must be applied even if your bonus is not dex :
			    //http://paizo.com/paizo/faq/v5748nruor1fm#v5748eaic9qdi

			    //blinded: uncanny dodge does not lose dex so set to ffAbility
			    if (blinded) {
			        loseDex = 1;
			        ability = ffAbility;
			        cmdAbility2 = cmdFFAbility2;
			    }

			    //Uncanny dodge still loses dex in these conditions, so set both to 0
			    if (pinned || cowering || stunned) {
			        loseDex = 1;
			        ffAbility = Math.min(0, ffAbility);
			        ability = Math.min(0, ffAbility);
			        cmdFFAbility2 = Math.min(0, cmdFFAbility2);
			        cmdAbility2 = Math.min(0, cmdFFAbility2);
			        dodge = 0;
			    }

			    var ac = 10 + armor + shield + natural + size + dodge + ability + deflect + miscAC + condPenalty + buffs;
			    var touch = 10 + size + dodge + ability + deflect + miscAC + condPenalty + buffsTouch;
			    var ff = 10 + armor + shield + natural + size + ffAbility + deflect + miscAC + condPenalty + buffs + (ffAbility > 0 ? dodge : 0);
			    var cmd = 10 + bab + cmdAbility1 + cmdAbility2 + (-1 * size) + dodge + deflect + miscCMD + cmdPenalty + buffsCMD;
			    var cmdFF = 10 + bab + cmdAbility1 + cmdFFAbility2 + (-1 * size) + deflect + miscCMD + cmdPenalty + buffsCMD + (cmdFFAbility2 > 0 ? dodge : 0);

			    //use 0 not 10 to force an update so don't need to check for NaN
			    var currAC = parseInt(v["AC"], 10) || 0;
			    var currTouch = parseInt(v["Touch"], 10) || 0;
			    var currFF = parseInt(v["Flat-Footed"], 10) || 0;
			    var currCMD = parseInt(v["CMD"], 10) || 0;
			    var currCMDFF = parseInt(v["FF-CMD"], 10) || 0;

			    if (ac !== currAC) { setter["AC"] = ac; setAny += 1; }
			    if (touch !== currTouch) { setter["Touch"] = touch; setAny += 1; }
			    if (ff !== currFF) { setter["Flat-Footed"] = ff; setAny += 1; }
			    if (cmd !== currCMD) { setter["CMD"] = cmd; setAny += 1; }
			    if (cmdFF !== currCMDFF) { setter["FF-CMD"] = cmdFF; setAny += 1; }
			    if (setAny) {
			        setAttrs(setter);
			    }

			});
    },


    /*updateArmor
     * updates total AC and penalty and max dex
     * if not proficient sets attack penalty
     * for backward compatiblity, proficiency is string and 0 is proficient, anything else non proficient
     */
    updateArmor = function () {
        getAttrs(["shield-equipped", "shield-acbonus", "shield-max-dex", "shield-acp", "shield-spell-fail", "shield-proficiency",
         "shield2-equipped", "shield2-acbonus", "shield2-max-dex", "shield2-acp", "shield2-spell-fail", "shield2-proficiency",
         "armor-equipped", "armor-acbonus", "armor-max-dex", "armor-acp", "armor-spell-fail", "armor-proficiency",
         "armor2-equipped", "armor2-acbonus", "armor2-max-dex", "armor2-acp", "armor2-spell-fail", "armor2-proficiency",
         "acp", "max-dex", "AC-armor", "AC-shield", "spell-fail", "acp-attack-mod",
         "max-dex-source", "acp-source"], function (v) {
             //console.log(v);
             var acp = 0, maxDex = 99, acA = 0, acS = 0, sp = 0, atk = 0;
             var subAC, subD, subAcp, nonProf, subsp;
             var currACP, currMaxDex, currACArmor, currACShield, currSpellFail, currAtkMod;
             var maxDexDropdown = parseInt(v["max-dex-source"], 10);
             var acpDropdown = parseInt(v["acp-source"], 10);
             var setAny = 0, setter = {};

             if (v["armor-equipped"] == "1") {
                 subAC = parseInt(v["armor-acbonus"], 10) || 0;
                 subD = parseInt(v["armor-max-dex"], 10); subD = isNaN(subD) ? 99 : subD; //cannot do "or 0" since 0 is valid but falsy
                 subAcp = parseInt(v["armor-acp"], 10) || 0;
                 nonProf = parseInt(v["armor-proficiency"], 10) || 0;//assume proficient 0 is messing with it //prof=isNaN(prof)?0:prof;//cannot do "||0" since 0 is valid but falsy
                 subsp = parseInt(v["armor-spell-fail"], 10) || 0;
                 acA += subAC;
                 maxDex = Math.min(subD, maxDex);
                 acp += subAcp;
                 sp += subsp;
                 if (nonProf) { atk += subAcp; }
                 //console.log("the proficiency is " + prof + " and attack penalty: " + atk);
             }
             if (v["armor2-equipped"] == "1") {
                 subAC = parseInt(v["armor2-acbonus"], 10) || 0;
                 subD = parseInt(v["armor2-max-dex"], 10); subD = isNaN(subD) ? 99 : subD; //cannot do "or 0" since 0 is valid but falsy
                 subAcp = parseInt(v["armor2-acp"], 10) || 0;
                 nonProf = parseInt(v["armor2-proficiency"], 10) || 0;//a;prof=isNaN(prof)?1:prof;
                 subsp = parseInt(v["armor2-spell-fail"], 10) || 0;
                 acA += subAC;
                 maxDex = Math.min(subD, maxDex);
                 acp += subAcp;
                 sp += subsp;
                 if (nonProf) { atk += subAcp; }
             }
             if (v["shield-equipped"] == "1") {
                 subAC = parseInt(v["shield-acbonus"], 10) || 0;
                 subD = parseInt(v["shield-max-dex"], 10); subD = isNaN(subD) ? 99 : subD; //cannot do "or 0" since 0 is valid but falsy
                 subAcp = parseInt(v["shield-acp"], 10) || 0;
                 nonProf = parseInt(v["shield-proficiency"], 10) || 0;//a;prof=isNaN(prof)?1:prof;
                 subsp = parseInt(v["shield-spell-fail"], 10) || 0;
                 acS += subAC;
                 maxDex = Math.min(subD, maxDex);
                 acp += subAcp;
                 sp += subsp;
                 if (nonProf) { atk += subAcp; }
             }
             if (v["shield2-equipped"] == "1") {
                 subAC = parseInt(v["shield2-acbonus"], 10) || 0;
                 subD = parseInt(v["shield2-max-dex"], 10); subD = isNaN(subD) ? 99 : subD; //cannot do "or 0" since 0 is valid but falsy
                 subAcp = parseInt(v["shield2-acp"], 10) || 0;
                 nonProf = parseInt(v["shield2-proficiency"], 10) || 0;//a;prof=isNaN(prof)?1:prof;
                 subsp = parseInt(v["shield2-spell-fail"], 10) || 0;
                 acS += subAC;
                 maxDex = Math.min(subD, maxDex);
                 acp += subAcp;
                 sp += subsp;
                 if (nonProf) { atk += subAcp; }
             }
             //if not using armor and shield then use value in the dropdown
             //armor and shield are not a number
             if (!isNaN(maxDexDropdown)) {
                 maxDex = maxDexDropdown;
                 if (maxDex === 9999) { maxDex = 99; }
             }
             if (!isNaN(acpDropdown)) {
                 acp = acpDropdown;
             }

             currACP = parseInt(v.acp, 10) || 0;
             currMaxDex = parseInt(v["max-dex"], 10);//cannot do "||0" since 0 is valid but falsy

             currMaxDex = isNaN(currMaxDex) ? 99 : currMaxDex;

             //using -1 forces update
             currACArmor = parseInt(v["AC-armor"], 10) || -1;
             currACShield = parseInt(v["AC-shield"], 10) || -1;
             currSpellFail = parseInt(v["spell-fail"], 10) || -1;
             currAtkMod = parseInt(v["acp-attack-mod"], 10) || 0;

             //console.log(v);
             //console.log("curr atk mod:"+currAtkMod+", curr acp:"+currACP+", new acp:"+acp+", currMaxDex:"+currMaxDex+", new maxdex:"+maxDex);

             if (currACP !== acp) { setter["acp"] = acp; setAny = 1; }
             if (currMaxDex !== maxDex) { setter["max-dex"] = maxDex; setAny = 1; }
             if (currACArmor !== acA) { setter["AC-armor"] = acA; setAny = 1; }
             if (currACShield !== acS) { setter["AC-shield"] = acS; setAny = 1; }
             if (currSpellFail !== sp) { setter["spell-fail"] = sp; setAny = 1; }
             if (currAtkMod !== atk) { setter["acp-attack-mod"] = atk; setAny = 1; }
             if (setAny) {
                 setAttrs(setter);
             }
         });
    },


    updateConditionsSavePenalty = function () {
        getAttrs(["condition-Fear", "condition-Sickened", "condition-Drained", "condition-Wounds", "saves-cond"], function (v) {
            var fear = parseInt(v["condition-Fear"], 10) || 0,
                sickened = parseInt(v["condition-Sickened"], 10) || 0,
                drained = parseInt(v["condition-Drained"], 10) || 0,
                wounds = parseInt(v["condition-Wounds"], 10) || 0,
                currCond = parseInt(v["saves-cond"], 10) || 0;
            var newCond = drained - fear - sickened - wounds;
            if (currCond !== newCond) {
                setAttrs({ "saves-cond": newCond });
            }
        });
    },

    /* updateSave
    * updates the saves for a character
    * @save = type of save: Fort, Ref, Will  (first character capitalized)
    */
    updateSave = function (save) {
        var getFields = [save, "total-" + save, save + "-ability-mod", save + "-trait", save + "-enhance", save + "-resist", save + "-misc", "saves-cond", "buff_" + save + "-total"];
        updateRowTotal(getFields);
    },

    updateAttackEffectTotals = function () {
        getAttrs(["attk-effect-total",
            "attk-effect_mod_1", "attk-effect_mod_1_Toggle", "attk-effect_mod_2", "attk-effect_mod_2_Toggle",
            "attk-effect_mod_3", "attk-effect_mod_3_Toggle", "attk-effect_mod_4", "attk-effect_mod_4_Toggle"], function (v) {
                var attkEffectTot = ((v["attk-effect_mod_1_Toggle"] == "1") ? (parseInt(v["attk-effect_mod_1"], 10) || 0) : 0) +
                    ((v["attk-effect_mod_2_Toggle"] == "1") ? (parseInt(v["attk-effect_mod_2"], 10) || 0) : 0) +
                    ((v["attk-effect_mod_3_Toggle"] == "1") ? (parseInt(v["attk-effect_mod_3"], 10) || 0) : 0) +
                    ((v["attk-effect_mod_4_Toggle"] == "1") ? (parseInt(v["attk-effect_mod_4"], 10) || 0) : 0),
                currAttk = parseInt(v["attk-effect-total"], 10) || 0,
                setters = {};
                if (isNaN(currAttk) || currAttk !== attkEffectTot) {
                    setters["attk-effect-total"] = attkEffectTot;
                    setAttrs(setters);
                    //short circuit 
                    //updateRepeatingWeaponAttacks("attk-effect-total",attkEffectTot);
                }
            });
    },

    updateDMGEffectTotals = function () {
        getAttrs(["dmg-effect-total",
            "dmg-effect_mod_1", "dmg-effect_mod_1_Toggle", "dmg-effect_mod_2", "dmg-effect_mod_2_Toggle",
            "dmg-effect_mod_3", "dmg-effect_mod_3_Toggle", "dmg-effect_mod_4", "dmg-effect_mod_4_Toggle"], function (v) {
                var dmgEffectTot = ((v["dmg-effect_mod_1_Toggle"] == "1") ? (parseInt(v["dmg-effect_mod_1"], 10) || 0) : 0) +
                    ((v["dmg-effect_mod_2_Toggle"] == "1") ? (parseInt(v["dmg-effect_mod_2"], 10) || 0) : 0) +
                    ((v["dmg-effect_mod_3_Toggle"] == "1") ? (parseInt(v["dmg-effect_mod_3"], 10) || 0) : 0) +
                    ((v["dmg-effect_mod_4_Toggle"] == "1") ? (parseInt(v["dmg-effect_mod_4"], 10) || 0) : 0),
                currDmg = parseInt(v["dmg-effect-total"], 10) || 0,
                setters = {};
                if (isNaN(currDmg) || currDmg !== dmgEffectTot) {
                    setters["dmg-effect-total"] = dmgEffectTot;
                    setAttrs(setters);
                    //short circuit
                    //updateRepeatingWeaponDamages("dmg-effect-total",dmgEffectTot);
                }
            });
    },

     updateDamageNote = function () {
         getAttrs(["size", "DMG-cnote"], function (v) {
             var size = (parseInt(v["size"], 10) || 0),
                 note = "";
             if (size < 0) {
                 note = "Increase damage die";
             } else if (size > 0) {
                 note = "Decrease damage die";
             }
             if (v["DMG-cnote"] !== note) {
                 setAttrs({ "DMG-cnote": note });
             }
         });
     },

     updateDamage = function () {
         updateRowTotal(["DMG-mod", "buff_DMG-total"], 0, ["condition-Sickened"]);
     },

    /* updateConditionAttackPenalty
     *
     * updates the attk-penalty for attacks based on conditions (including wearing armor you are not proficient in)
     */
    updateConditionAttackPenalty = function () {
        var adds = ["attk-penalty", "condition-Invisible", "acp-attack-mod", "condition-Drained"]
            , subtracts = ["condition-Dazzled", "condition-Entangled", "condition-Grappled"
            , "condition-Fear", "condition-Sickened", "condition-Prone"
            , "condition-Wounds"];
        updateRowTotal(adds, 0, subtracts);
    },

    updateConditionAttackNote = function () {
        getAttrs(["condition-Grappled", "condition-Invisible"], function (v) {
            var setter = {}, setAny = 0, gnote, cnote;
            if (v["condition-Grappled"] != "0") {
                gnote = "+" + v["condition-Grappled"] + " grapple";
            }
            if (v["condition-Invisible"] != "0") {
                cnote = "vs sighted, +ignore dex";
            }
            if (!(!v["attk-CMB-cnote"] && !gnote) && v["attk-CMB-cnote"] !== gnote) {
                setter["attk-CMB-cnote"] = gnote;
                setAny = 1;
            }
            if (!(!v["attk-cnote"] && !cnote) && v["attk-cnote"] !== cnote) {
                setter["attk-cnote"] = cnote;
                setAny = 1;
            }
            if (setAny) {
                setAttrs(setter);
            }
        });
    },


	attackGridFields = {
	    "melee": { "size": "size", "atk": "attk-melee", "buff": "buff_Melee-total", "abilityMod": "melee-ability-mod", "misc": "attk-melee-misc" }
		, "ranged": { "size": "size", "atk": "attk-ranged", "buff": "buff_Ranged-total", "abilityMod": "ranged-ability-mod", "misc": "attk-ranged-misc" }
		, "CMB": { "size": "CMD-size", "atk": "CMB", "buff": "buff_Melee-total", "abilityMod": "CMB-ability-mod", "misc": "attk-CMB-misc" }
	},

    /* updateAttack
     * Updates the attack type totals at top of attack page for one row of grid
     *
     * @attype = the type of attack: melee, ranged, CMB case sensitive
     */
    updateAttack = function (attype) {
        console.log("at updateAttack:" + attype);
        var fields = [attackGridFields[attype].atk, "bab", "attk-penalty"
			, attackGridFields[attype].abilityMod, attackGridFields[attype].misc
			, attackGridFields[attype].size, attackGridFields[attype].buff];
        console.log(fields);
        updateRowTotal([attackGridFields[attype].atk, "bab", "attk-penalty"
			, attackGridFields[attype].abilityMod, attackGridFields[attype].misc
			, attackGridFields[attype].size, attackGridFields[attype].buff]);
    },


	/*handleRepeatingAttackDropdown
	*/
    handleRepeatingAttackDropdown = function (id, eventInfo) {
        var idStr = getRepeatingIDStr(id), prefix = "repeating_weapon_" + idStr;
        //console.log("TRACE:handleRepeatingAttackDropdown id:" + id+", eventinfo is");
        //console.log(eventInfo);
        //console.log("TRACE end");
        if (isBadRowId("weapon", id, true)) {
            console.log("ERROR: handleRepeatingAttackDropdown, invalid id:" + id);
            return;
        }
        handleDropdown(prefix + "attack-type", prefix + "attack-type-mod");
    },

    /* handleRepeatingDamageDropdown
    * this is a special case of dropdown, because it contains a possible multipler Damage ability dropdown.
    * better to split this into two
    */
    handleRepeatingDamageDropdown = function (id) {
        var idStr = getRepeatingIDStr(id)
		, readField = id ? "repeating_weapon_" + idStr + "damage-ability" : "repeating_weapon_damage-ability"
		, writeField = id ? readField + "-mod" : "repeating_weapon_damage-ability-mod";
        if (isBadRowId("weapon", id, true)) {
            console.log("ERROR: handleRepeatingDamageDropdown, invalid id:" + id);
            return;
        }
        getAttrs([readField, writeField], function (v) {
            var ability = findAbilityInString(v[readField]),
                mult = findMultiplier(v[readField]);
            getAttrs([ability], function (v2) {
                var basemod = parseInt(v2[ability], 10) || 0;
                var dmgmod = Math.floor(basemod * mult);
                var currentmod = parseInt(v[writeField], 10) || 0;
                var setter = {};
                if (dmgmod !== currentmod) {
                    setter[writeField] = dmgmod;
                    setAttrs(setter);
                    //short circuit 
                    //updateRepeatingWeaponDamage(id,"damage-ability-mod",value);
                }
            });
        });
    },

	/*updateRepeatingWeaponAttack
	* @id {string} optional = id of row, if blank we are within the context of the row
	* @overrideAttr {string} optional = if we are passing in a value this is the fieldname after "repeating_weapon_"
	* @overrideValue {number} optional = if overrideAttr then this should be a number usually int but it won't check
	*/
    updateRepeatingWeaponAttack = function (id, eventInfo) {
        //is it faster to not do the idstr each time? try it with ?:
        var idStr = getRepeatingIDStr(id)
		, enhanceField = id ? "repeating_weapon_" + idStr + "enhance" : "repeating_weapon_enhance"
		, mwkField = id ? "repeating_weapon_" + idStr + "masterwork" : "repeating_weapon_masterwork"
		, attkTypeModField = id ? "repeating_weapon_" + idStr + "attack-type-mod" : "repeating_weapon_attack-type-mod"
		, attkEffectField = "attk-effect-total"
		, attkEffectCopyField = id ? "repeating_weapon_" + idStr + "attk-effect-total-copy" : "repeating_weapon_attk-effect-total-copy"
		, profField = id ? "repeating_weapon_" + idStr + "proficiency" : "repeating_weapon_proficiency"
		, attkMacroModField = id ? "repeating_weapon_" + idStr + "attack-mod" : "repeating_weapon_attack-mod"
		, totalAttackField = id ? "repeating_weapon_" + idStr + "total-attack" : "repeating_weapon_total-attack"
        ;

        if (isBadRowId("weapon", id, true)) {
            console.log("ERROR: updateRepeatingWeaponAttack, invalid id:" + id);
            return;
        }


        getAttrs([enhanceField, mwkField, attkTypeModField, attkEffectField, attkEffectCopyField, profField, attkMacroModField, totalAttackField], function (v) {
            var enhance = (parseInt(v[enhanceField], 10) || 0)
                , masterwork = (parseInt(v[mwkField], 10) || 0)
				, attackEffectTotal = (parseInt(v[attkEffectField], 10) || 0)
				, currAttackEffectTotal = (parseInt(v[attkEffectCopyField], 10) || 0)
				, attkTypeMod = (parseInt(v[attkTypeModField], 10) || 0)
				, prof = (parseInt(v[profField], 10) || 0)
				, attkMacroMod = (parseInt(v[attkMacroModField], 10) || 0)
				, currTotalAttack = (parseInt(v[totalAttackField], 10) || 0)
                , newTotalAttack = 0
				, setter = {}, setAny = 0;

            newTotalAttack = Math.max(enhance, masterwork) + attackEffectTotal + attkTypeMod + prof + attkMacroMod;
            if (newTotalAttack !== currTotalAttack || isNaN(currTotalAttack)) {
                setter[totalAttackField] = newTotalAttack;
                setAny = 1;
            }
            if (currAttackEffectTotal != attackEffectTotal) {
                setter[attkEffectCopyField] = attackEffectTotal;
                setAny = 1;
            }
            if (setAny) { setAttrs(setter); }
        });
    },

    updateRepeatingWeaponAttacks = function (eventInfo) {
        getSectionIDs("repeating_weapon", function (ids) {
            ids.forEach(function (id, index) {
                if (isBadRowId("weapon", id, false)) {
                    console.log("ERROR: updateRepeatingWeaponAttacks, invalid id:" + id + ", index:" + index);
                    return;
                }
                updateRepeatingWeaponAttack(id, eventInfo);
            });
        });
    },


    updateRepeatingWeaponDamage = function (id, eventInfo) {
        var idStr = getRepeatingIDStr(id),
            maxname = "repeating_weapon_" + idStr + "damage-ability-max",
            modname = "repeating_weapon_" + idStr + "damage-ability-mod",
			dmgEffectCopy = "repeating_weapon_" + idStr + "dmg-effect-total-copy",
			dmgModCopy = "repeating_weapon_" + idStr + "DMG-mod-copy";
        if (isBadRowId("weapon", id, true)) {
            console.log("ERROR: updateRepeatingWeaponDamage, invalid id:" + id);
            return;
        }
        getAttrs([maxname, modname, dmgEffectCopy, dmgModCopy, "dmg-effect-total", "DMG-mod"], function (v) {
            var dmgFields, setter = {}, setAny = 0,
                max = parseInt(v[maxname], 10) || 0,
                mod = parseInt(v[modname], 10) || 0,
				dmgEffect = (parseInt(v["dmg-effect-total"], 10) || 0),
				dmgMod = (parseInt(v["DMG-mod"], 10) || 0),
				currDmgEffect = (parseInt(v[dmgEffectCopy], 10) || 0),
				currDmgMod = (parseInt(v[dmgModCopy], 10) || 0);
            if (max <= 0) { max = 9999; }
            mod = Math.min(max, mod) + dmgEffect + dmgMod;

            dmgFields = ["repeating_weapon_" + idStr + "total-damage", "repeating_weapon_" + idStr + "enhance",
               "repeating_weapon_" + idStr + "damage-mod"];
            updateRowTotal(dmgFields, mod);
            if (dmgMod !== currDmgMod) {
                setter[dmgModCopy] = dmgMod;
                setAny = 1;
            }
            if (dmgEffect !== currDmgEffect) {
                setter[dmgEffectCopy] = dmgEffect;
                setAny = 1;
            }
            if (setAny) { setAttrs(setter); }
        });
    },

    updateRepeatingWeaponDamages = function (fieldUpdated, value) {
        getSectionIDs("repeating_weapon", function (ids) {
            ids.forEach(function (id, index) {
                if (isBadRowId("weapon", id, false)) {
                    console.log("ERROR: updateRepeatingWeaponDamages, invalid id:" + id + ", index:" + index);
                    return;
                }
                updateRepeatingWeaponDamage(id);
                //updateRepeatingWeaponDamage(id,fieldUpdated,value);
            });
        });
    },

    /* updateNPCHP
    * updates the NPC hp, and also PC hp, because some people use "HP" attributes for monsters. could put this in config as well,  */
    updateNPCHP = function () {
        getAttrs(["NPC-HD", "NPC-HD-num", "NPC-HD2", "NPC-HD-num2", "NPC-HD-misc-mod", "NPC-HP_max", "NPC-HP", "sync_npc_pc_hp"], function (v) {
            var hp = Math.floor(((parseInt(v["NPC-HD"], 10) || 0) + 1) / 2 * (parseInt(v["NPC-HD-num"], 10) || 0))
                    + Math.floor(((parseInt(v["NPC-HD2"], 10) || 0) + 1) / 2 * (parseInt(v["NPC-HD-num2"], 10) || 0))
                    + (parseInt(v["NPC-HD-misc-mod"], 10) || 0),
                maxhp = parseInt(v["NPC-HP_max"], 10) || 0,
                currhp = parseInt(v["NPC-HP"], 10) || 0,
                updatehp = parseInt(v.sync_npc_pc_hp, 10) || 0,
                setter = {}, setAny = 0;
            //console.log("HHHHHHHHHHHHHHHHHHHHHHHHH updateNPCHP, hp:"+hp+", maxhp:"+maxhp);
            //console.log(v);
            if (hp !== maxhp) {
                setter["NPC-HP_max"] = hp;
                if (updatehp) { setter["HP"] = hp; }
                setAny = 1;
                //first time
                if ((currhp === 0 && maxhp === 0) || (currhp === maxhp)) {
                    setter["NPC-HP"] = hp;
                    if (updatehp) { setter["HP_max"] = hp; }
                }
            }
            if (setAny) { setAttrs(setter); }
        });
    },

    /* updateMaxSkills
    * Calculates maximum skill ranks. Minimum 1 per level.
    */
    updateMaxSkills = function () {
        getAttrs(["total-skill", "total-fcskill", "INT-mod", "level", "Max-Skill-Ranks-mod", "Max-Skill-Ranks", "Max-Skill-Ranks-Misc2",
            "unchained_skills-show", "BG-Skill-Use"], function (v) {
                var intMod = parseInt(v["INT-mod"], 10) || 0,
                    classSkills = parseInt(v["total-skill"], 10) || 0,
                    otherMod = parseInt(v["Max-Skill-Ranks-Misc2"], 10) || 0,
                    level = parseInt(v.level, 10) || 0,
                    fcSkills = parseInt(v["total-fcskill"], 10) || 0,
                    extra = parseInt(v["Max-Skill-Ranks-mod"], 10) || 0,
                    currSkills = parseInt(v["Max-Skill-Ranks"], 10) || 0,
                    totIntMod, classPlusInt, totAllSkills,
                    setter = {}, setAny = 0;
                totIntMod = intMod * level;
                classPlusInt = classSkills + totIntMod;
                if (v["unchained_skills-show"] == "1" && (!v["BG-Skill-Use"] || v["BG-Skill-Use"] == "0")) {
                    classPlusInt = Math.floor(classPlusInt / 2);
                }
                if (classPlusInt < level) { classPlusInt = level; }
                totAllSkills = classPlusInt + fcSkills + extra + otherMod;
                if (currSkills !== totAllSkills) { setter["Max-Skill-Ranks"] = totAllSkills; setAny++; }
                if (setAny) { setAttrs(setter); }
            });
    },

	acpSkills = {
	    "Acrobatics": 1, "Climb": 1, "Disable-Device": 1, "Escape-Artist": 1, "Fly": 1, "Ride": 1, "Sleight-of-Hand": 1, "Stealth": 1, "Swim": 1,
	    "CS-Acrobatics": 1, "CS-Athletics": 1, "CS-Finesse": 1, "CS-Stealth": 1
	},
	sizeSkills = {
	    "Fly": 1, "Stealth": 2
	},
    updateSkill = function (skill) {
        var csNm = skill + "-cs",
        ranksNm = skill + "-ranks",
        classNm = skill + "-class",
        abNm = skill + "-ability",
        modNm = skill + "-ability-mod",
        racialNm = skill + "-racial",
        featNm = skill + "-feat",
        itemNm = skill + "-item",
        miscNm = skill + "-misc",
        rtNm = skill + "-ReqTrain";
        getAttrs([skill, csNm, ranksNm, classNm, abNm, modNm, racialNm, featNm, itemNm, miscNm, rtNm,
        "size_skill", "size_skill_double", "acp", "checks-cond", "Phys-skills-cond", "Perception-cond"], function (v) {

            var skillSize = 0, adj, skillTot = 0, setter = {}, mods = "", setAny = 0, cond = 0,
            cs = parseInt(v[csNm], 10) || 0,
            currSkill = parseInt(v[skill], 10),//no default
            ranks = parseInt(v[ranksNm], 10) || 0,
            rt = parseInt(v[rtNm], 10) || 0,
            allCond = parseInt(v["checks-cond"], 10) || 0,
            abilityName = findAbilityInString(v[abNm]),
            physCond = 0, perCond = 0;

            if (ranks && cs) {
                skillTot += 3;
                mods = "3/";
            } else {
                mods = "0/";
            }
            if (acpSkills[skill]) {
                adj = parseInt(v["acp"], 10) || 0;
                skillTot += adj;
                mods += adj + "/";
            } else {
                mods += "0/";
            }
            skillSize = sizeSkills[skill];
            if (skillSize) {
                if (skillSize === 1) {
                    adj = parseInt(v["size_skill"], 10) || 0;
                    skillTot += adj;
                    mods += adj + "/";
                } else if (skillSize === 2) {
                    adj = parseInt(v["size_skill_double"], 10) || 0;
                    skillTot += adj;
                    mods += adj + "/";
                }
            } else {
                mods += "0/";
            }
            if (abilityName === "DEX-mod" || abilityName === "STR-mod") {
                physCond = parseInt(v["Phys-skills-cond"], 10) || 0;
            }
            if (skill === "Perception" || skill === "CS-Perception") {
                perCond = parseInt(v["Perception-cond"], 10) || 0;
            }
            cond = allCond + physCond + perCond;
            mods += cond;

            skillTot += ranks + cond + (parseInt(v[modNm], 10) || 0) + (parseInt(v[racialNm], 10) || 0) +
                (parseInt(v[featNm], 10) || 0) + (parseInt(v[itemNm], 10) || 0) + (parseInt(v[miscNm], 10) || 0);

            if (currSkill !== skillTot) {
                setter[skill] = skillTot;
                setAny++;
            }


            if ((v[classNm] || "0/0/0/0") !== mods) {
                setter[classNm] = mods;
                setAny++;
            }
            if (setAny) { setAttrs(setter); }
        });
    },

    /*updateConditionCheckPenalty
    * Reads in condition that affect Ability and Skill checks and updates condition fields.
    * checks-cond, Phys-skills-cond, Perception-cond.
    */
    updateConditionCheckPenalty = function () {
        //console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCC at updateConditionCheckPenalty");
        getAttrs(["condition-Blinded", "condition-Fear", "condition-Drained", "condition-Sickened", "condition-Wounds"
		, "checks-cond", "Phys-skills-cond", "Perception-cond", "buff_Check-total"
		, "CasterLevel-Penalty"]
			, function (v) {
			    //there is no Fascinated, if we add it then:
			    //,"condition-Fascinated" -4 to perception
			    var buffCheck = parseInt(v["buff_Check-total"], 10) || 0

                , drained = parseInt(v["condition-Drained"], 10) || 0
                , fear = -1 * (parseInt(v["condition-Fear"], 10) || 0)
                , sick = -1 * (parseInt(v["condition-Sickened"], 10) || 0)
                , wounds = -1 * (parseInt(v["condition-Wounds"], 10) || 0)
                , allSkills = buffCheck + drained + fear + sick + wounds
                , casterlevel = drained + wounds
                , blindedMod = -2 * (parseInt(v["condition-Blinded"], 10) || 0)
                , currAllSkills = parseInt(v["checks-cond"], 10)
                , currPhysSkills = parseInt(v["Phys-skills-cond"], 10)
                , currPerSkills = parseInt(v["Perception-cond"], 10)
                , currCaster = parseInt(v["CasterLevel-Penalty"], 10)
                , casterpen = 0
                , setter = {}, setAny = 0;

			    if (allSkills !== currAllSkills || isNaN(currAllSkills)) {
			        setter["checks-cond"] = allSkills;
			        setAny = 1;
			    }
			    if (blindedMod !== currPhysSkills || isNaN(currPhysSkills)) {
			        setter["Phys-skills-cond"] = blindedMod;
			        setAny = 1;
			    }
			    if (blindedMod !== currPerSkills || isNaN(currPerSkills)) {
			        setter["Perception-cond"] = blindedMod;
			        setAny = 1;
			    }
			    if (casterlevel !== currCaster || isNaN(currCaster)) {
			        setter["CasterLevel-Penalty"] = casterlevel;
			        setAny = 1;
			    }
			    //console.log("about to set " + setter);
			    if (setAny) {
			        setAttrs(setter);
			    }
			});
    },

	findSpellClass = function (selected) {
	    if (!selected) { return 0; } //it is undefined if it is default set to the first one
	    if (selected.indexOf("0") >= 0) { return 0; }
	    if (selected.indexOf("1") >= 0) { return 1; }
	    if (selected.indexOf("2") >= 0) { return 2; }
	    return 0;
	},

	/* ifSpellClassExists 
	* if spellclass-classidx-level is greater than 0 then call the callback 
	* only check level, not level-total, since modifiers could cause it to drop
	*/
	ifSpellClassExists = function (classidx, callback) {
	    getAttrs(["spellclass-" + classidx + "-level"], function (v) {
	        if ((parseInt(v["spellclass-" + classidx + "-level"], 10) || 0) > 0) {
	            callback();
	        }
	    });
	},

	/* When a class-x-level is updated, send the x to this function.
	* it will check the 3 spellclasses, and if one is set to x, then update the spellclass level too.
	*/
	updateSpellClassLevel = function (classidx) {
	    var spellclassdropdown0 = "spellclass-0", spellclassdropdown1 = "spellclass-1", spellclassdropdown2 = "spellclass-2";
	    getAttrs([spellclassdropdown0, spellclassdropdown1, spellclassdropdown2], function (va) {
	        var spellclassidx, spellclasslevel, classlevel;
	        if (parseInt(va[spellclassdropdown0], 10) === classidx) { spellclassidx = 0; }
	        else if (parseInt(va[spellclassdropdown1], 10) === classidx) { spellclassidx = 1; }
	        else if (parseInt(va[spellclassdropdown2], 10) === classidx) { spellclassidx = 2; }
	        else { return; }
	        spellclasslevel = "spellclass-" + spellclassidx + "-level";
	        classlevel = "class-" + classidx + "-level";
	        getAttrs([spellclasslevel, classlevel], function (v) {
	            var setter = {}, cll = parseInt(v[classlevel], 10) || 0
				, spl = parseInt(v[spellclasslevel], 10);
	            if (cll !== spl || isNaN(spl)) {
	                setter[spellclasslevel] = cll;
	                setAttrs(setter);
	            }
	        });
	    });
	},

	/* When the spell class dropdown is changed to one of the 5 classees, update the spellclass name and level.
	*/
    handleSpellClassDropdown = function (spellclassidx) {
        //console.log("SSSSSSSSSSSSSSSSSSSSS handleSpellClassDropdown, level is :"+spellclassidx);
        var spellclassdropdown = "spellclass-" + spellclassidx;
        var spellclasslevel = "spellclass-" + spellclassidx + "-level";
        getAttrs([spellclassdropdown, spellclasslevel], function (va) {
            //console.log(va);
            var classidx = (parseInt(va[spellclassdropdown], 10))
				, sl = parseInt(va[spellclasslevel], 10)
				, spellclassname, classname, classlevel;
            if (isNaN(classidx) || !va[spellclassdropdown] || va[spellclassdropdown] == "-1") {
                return;
            }
            spellclassname = "spellclass-" + spellclassidx + "-name";
            classname = "class-" + classidx + "-name";
            classlevel = "class-" + classidx + "-level";
            //console.log("classname:"+classname+", level:"+ classlevel+", spellname:"+spellclassname);
            getAttrs([classname, classlevel, spellclassname], function (v) {
                var setter = {}, setAny = 0, cl = parseInt(v[classlevel], 10) || 0;
                //console.log("made it into get attrs");
                //console.log(v);
                if (v[classname] && v[classname] !== v[spellclassname]) {
                    setter[spellclassname] = v[classname];
                    setAny = 1;
                }
                if (sl !== cl || isNaN(sl)) {
                    setter[spellclasslevel] = cl;
                    setAny = 1;
                }
                //console.log("SETTING");
                //console.log(setter);
                if (setAny) { setAttrs(setter); }
            });

        });
    },

    updateCastingPenaltyNote = function () {
        ifSpellClassExists(0, function () {
            getAttrs(["condition-Deafened", "SpellFailureNote"], function (v) {
                var setter = {}, notestr = "";
                if (v["condition-Deafened"] != "0") {
                    notestr = "20% spell failure when casting spells with Verbal components";
                }
                setAttrs({ "SpellFailureNote": notestr });
            });
        });
    },

    updateSaveDCs = function (classidx) {
        //console.log("DDDDDDCCCCCC at updateSaveDCs");
        getAttrs(["spellclass-" + classidx + "-level"], function (va) {
            var fields, classlevel;
            classlevel = parseInt(va["spellclass-" + classidx + "-level"], 10);
            //console.log("the spellclass level is "+classlevel);
            if (isNaN(classlevel) || classlevel < 1) {
                return;
            }
            fields = ["Concentration-" + classidx + "-mod",
                "spellclass-" + classidx + "-level-0-savedc",
                "spellclass-" + classidx + "-level-1-savedc",
                "spellclass-" + classidx + "-level-2-savedc",
                "spellclass-" + classidx + "-level-3-savedc",
                "spellclass-" + classidx + "-level-4-savedc",
                "spellclass-" + classidx + "-level-5-savedc",
                "spellclass-" + classidx + "-level-6-savedc",
                "spellclass-" + classidx + "-level-7-savedc",
                "spellclass-" + classidx + "-level-8-savedc",
                "spellclass-" + classidx + "-level-9-savedc"];
            //console.log(fields);

            getAttrs(fields, function (v) {
                //console.log(v);
                var mod, fieldname, dcBeforeLvl, currDC = 0, newDC = 0, setter = {}, setAny = 0, i;
                mod = parseInt(v["Concentration-" + classidx + "-mod"], 10) || 0;
                dcBeforeLvl = 10 + mod;

                fieldname = "spellclass-" + classidx + "-level-0-savedc";
                //console.log("the base save dc is: "+dcBeforeLvl+" see if it matches " + fieldname);
                currDC = parseInt(v[fieldname], 10);
                //console.log("the old base dc is : "+ currDC);
                //if 0 is different then rest are different. if 0 is same, rest are same.
                if (isNaN(currDC) || currDC !== dcBeforeLvl) {
                    setter[fieldname] = dcBeforeLvl;
                    for (i = 1; i < 10; i++) {
                        //console.log("we are at "+i);
                        fieldname = "spellclass-" + classidx + "-level-" + i + "-savedc";
                        currDC = parseInt(v[fieldname], 10);
                        newDC = dcBeforeLvl + i;
                        //console.log(" field "+fieldname+ " is "+currDC+" but new is "+newDC);
                        if (isNaN(currDC) || currDC !== newDC) {
                            setter[fieldname] = newDC;
                        }
                        //console.log("at "+i+", the field to find is "+fieldname);
                    }
                    setAttrs(setter);
                }
            });

        });
    },


    updateConcentration = function (classidx) {
        updateRowTotal(["Concentration-" + classidx, "spellclass-" + classidx + "-level-total", "Concentration-" + classidx + "-mod", "Concentration-" + classidx + "-misc"]);

    },




    handleConcentrationAbilityDropdown = function (classidx) {
        handleDropdown("Concentration-" + classidx + "-ability", ["Concentration-" + classidx + "-mod"]);
    },

	/*
	* updateBonusSpells
	* updates Bonus Spells for the class
	* It looks at the attribute, not the attribute mod. So it does not change with ability damage or penalties.
	*/
    updateBonusSpells = function (classidx) {

        getAttrs(["Concentration-" + classidx + "-ability"], function (va) {
            var ability = findAbilityInString(va["Concentration-" + classidx + "-ability"]).replace("-mod", "");




            //eliminate the modifier, we just want @{INT} not @{INT-mod}
            getAttrs([ability], function (v) {

                var spellAbility = parseInt(v[ability], 10) || 0
                , fields = {}, bonusSpells, bonusName, i, newRaw;
                if (spellAbility >= 12) {
                    for (i = 1; i < 10; i++) {
                        newRaw = Math.max(0, spellAbility - 10 - (2 * (i - 1)));
                        bonusSpells = Math.ceil(newRaw / 8);
                        bonusName = "spellclass-" + classidx + "-level-" + i + "-bonus";

                        fields[bonusName] = bonusSpells;
                    }
                } else {
                    for (i = 1; i < 10; i++) {
                        bonusName = "spellclass-" + classidx + "-level-" + i + "-bonus";

                        fields[bonusName] = 0;
                    }
                }
                setAttrs(fields);
            });
        });
    },

    updateMaxSpellsPerDay = function (classidx, spelllvl) {
        var fields = ["spellclass-" + classidx + "-level-" + spelllvl + "-spells-per-day_max"
            , "spellclass-" + classidx + "-level-" + spelllvl + "-class"
            , "spellclass-" + classidx + "-level-" + spelllvl + "-bonus"
            , "spellclass-" + classidx + "-level-" + spelllvl + "-misc"];
        updateRowTotal(fields);
    },

    /*updateCasterLevel
    */
    updateCasterLevel = function (classidx) {
        updateRowTotal(["spellclass-" + classidx + "-level-total", "spellclass-" + classidx + "-level", "spellclass-" + classidx + "-level-misc", "buff_CasterLevel-total", "CasterLevel-Penalty"]);
    },

	updateSpellPenetration = function (classidx) {
	    updateRowTotal(["spellclass-" + classidx + "-SP-mod", "spellclass-" + classidx + "-SP_misc", "spellclass-" + classidx + "-level-total"]);
	},






	/*updateSpell
	* For a row in lvl-x-spells repeating sections, updates:
	*  cast_def_dc, cast_def, savedc, casterlevel, Concentration,spellPen
	* @section {string} =  lvl-0-spells , lvl-1-spells, etc
	* @id {string} optional = id of row, can be omitted if we're already in row context
	*/
	updateSpell = function (section, id, eventInfo) {
	    var idStr = getRepeatingIDStr(id)
			, prefix = "repeating_" + section + "_" + idStr
			, spellclassField = prefix + "spellclass"
			, spellLevelField = prefix + "spell_level";
	    //console.log("At updateSpell prefix: "+prefix+", classfield="+spellclassField);
	    getAttrs([spellLevelField, spellclassField], function (va) {
	        var spellLevel = (parseInt(va[spellLevelField], 10) || 0)
				, classNum = findSpellClass(va[spellclassField])
				, hasClass = (isNaN(classNum) || classNum < 0) ? false : true
				, spellDefCastDCField = prefix + "cast_def_dc"
				, spellDefConField = prefix + "cast_def-mod"
				, spellDCField = prefix + "savedc"
				, spellDCUserField = prefix + "DC_misc"
				, spellCLField = prefix + "casterlevel"
				, spellCLUserField = prefix + "CL_misc"
				, spellConField = prefix + "Concentration-mod"
				, spellConUserField = prefix + "Concentration_misc"
				, spellSpellPenField = prefix + "SP-mod"
				, spellSpellPenUserField = prefix + "SP_misc"
				, classCLField = "spellclass-" + classNum + "-level-total"
				, classDCField = "spellclass-" + classNum + "-level-" + spellLevel + "-savedc"
				, classConField = "Concentration-" + classNum
				, classDefConField = "Concentration-" + classNum + "-def"
				, classSpellPenField = "spellclass-" + classNum + "-SP_misc";

	        getAttrs([spellDCField, spellDCUserField, spellCLField, spellCLUserField
				, spellConField, spellConUserField, spellDefConField, spellDefCastDCField
				, spellSpellPenField, spellSpellPenUserField, classDCField, classCLField
				, classConField, classDefConField, classSpellPenField], function (v) {
				    var newDC, newCL, newCon, newDefCon, newSpellPen
                    , currDC = parseInt(v[spellDCField], 10)
                    , currCL = parseInt(v[spellCLField], 10)
                    , currCon = parseInt(v[spellConField], 10)
                    , currDefCon = parseInt(v[spellDefConField], 10)
                    , currdefDC = parseInt(v[spellDefCastDCField], 10)
                    , currSpellPen = parseInt(v[spellSpellPenField], 10)
                    , classDC = (parseInt(v[classDCField], 10) || 0)
                    , classCL = (parseInt(v[classCLField], 10) || 0)
                    , classCon = (parseInt(v[classConField], 10) || 0)
                    , classDefConMod = (parseInt(v[classDefConField], 10) || 0)
                    , classSpellPen = (parseInt(v[classSpellPenField], 10) || 0)
                    , defDC = 15 + (spellLevel * 2)
                    , classLevelDelta = 0, setter = {}, setAny = 0
				    ;
				    if (defDC !== currdefDC || isNaN(currdefDC)) {
				        setter[spellDefCastDCField] = defDC;
				        setAny = 1;
				    }
				    //Caster level check mod
				    newCL = (parseInt(v[spellCLUserField], 10) || 0) + classCL;
				    if (newCL !== currCL || isNaN(currCL)) {
				        classLevelDelta = newCL - (currCL || 0);
				        setter[spellCLField] = newCL;
				        setAny = 1;
				    }

				    //DC to save
				    newDC = (parseInt(v[spellDCUserField], 10) || 0) + classDC;
				    if (newDC !== currDC || isNaN(currDC)) {
				        setter[spellDCField] = newDC;
				        setAny = 1;
				    }
				    //Concentration check mod
				    newCon = (parseInt(v[spellConUserField], 10) || 0) + classCon + classLevelDelta;
				    if (newCon !== currCon || isNaN(currCon)) {
				        setter[spellConField] = newCon;
				        setAny = 1;
				    }
				    //concentration bonus when defensive casting
				    //no need to add class level delta, since it's built into newCon
				    newDefCon = newCon + classDefConMod;
				    if (newDefCon !== currDefCon || isNaN(currDefCon)) {
				        setter[spellDefConField] = newDefCon;
				        setAny = 1;
				    }

				    //Spell penetration check mod 
				    newSpellPen = newCL + classSpellPen + (parseInt(v[spellSpellPenUserField], 10) || 0);
				    if (newSpellPen !== currSpellPen || isNaN(currSpellPen)) {
				        setter[spellSpellPenField] = newSpellPen;
				        setAny = 1;
				    }

				    if (setAny) {
				        setAttrs(setter);
				    }

				});

	    });

	},

	/*updateSpells
	* calls updateSpell for every row of the given spell section
	* can call with either "lvl-0-spells", or with 0
	*/
    updateSpells = function (section) {
        var spelllvl = parseInt(section, 10);
        if (!isNaN(spelllvl)) {
            section = "lvl-" + spelllvl + "-spells";
        }
        getSectionIDs("repeating_" + section, function (ids) {
            ids.forEach(function (id, index) {
                updateSpell(section, id);
            });
        });
    },

	/*checkIsNewRow
	* Within row context of a repeating section item, 
	* if _new_flag is blank or 0 then call handleRepeatingRowOrdering
	* @section {string} = the name of the repeating section that appears after "repeating_"
	* @eventinfo = from the event that launched this
	*/
    checkIsNewRow = function (section, eventInfo) {
        if (!section || !eventInfo) { return; }
        //console.log("checkIsNewRow: event:"+eventInfo.sourceAttribute);	
        getAttrs(["repeating_" + section + "_new_flag"], function (v) {
            var startIdx, endIdx, newid, setter = {};
            if (v["repeating_" + section + "_new_flag"] != "1") {
                startIdx = ("repeating_" + section + "_").length;
                endIdx = eventInfo.sourceAttribute.indexOf("_", startIdx);
                if (endIdx <= 0) { return; }
                newid = eventInfo.sourceAttribute.substring(startIdx, endIdx);
                setter["repeating_" + section + "_row_id"] = newid;
                setter["repeating_" + section + "_new_flag"] = "1";
                setAttrs(setter);
                if (section.match(/lvl-.-spell/)) { updateSpell(section); }
            }
        });
    },


	/***********************************************************
	Recalculate section
	*/

	/*recalculateSpell
	* sets fields
	*/
	recalculateSpell = function (section, id) {
	    var spellLevelField = "repeating_" + section + "_" + id + "_spell_level",
		classLevelField = "repeating_" + section + "_" + id + "_spellclass",
		dcModField = "repeating_" + section + "_" + id + "_DC-mod",
		dcMiscField = "repeating_" + section + "_" + id + "_DC_misc"
	    ;
	    getAttrs([spellLevelField, classLevelField, dcModField, dcMiscField], function (v) {
	        var setter = {}, currLevel = parseInt(v[spellLevelField], 10),
			currDCMod = parseInt(v[dcModField], 10),
			currDCMisc = parseInt(v[dcMiscField], 10);



	        if (isNaN(currLevel)) {
	            setter[spellLevelField] = spellLevel;
	            setAttrs(setter);
	        }
	    });
	},

	/*recalculateSpellLevels
	* ensures that spell_level is set on each spell repeating row, since it was changed to an editable field
	* @spellLevel {int} = the DEFAULT spell level of the repeating section, from 0 to 9
	*/
    recalculateSpellLevels = function (spellLevel) {
        var section = "lvl-" + spellLevel + "-spells";
        getSectionIDs("repeating_" + section, function (ids) {
            ids.forEach(function (id, index) {
                recalculateSpell(section, id);
            });
        });
        getSectionIDs("repeating_" + section, function (ids) {
            ids.forEach(function (id, index) {
                updateSpell(section, id);
            });
        });
    },

	/*recalculateSpellLevelsAll
	* calls recalculateSpellLevels for each level
	*/
	recalculateSpellLevelsAll = function () {
	    var i = 0;
	    for (i = 0; i < 10; i++) {
	        recalculateSpellLevels(i);
	    }
	},

    /* recalculateRepeatingWeapons
    * recalculates all repeating weapons rows.
    *
    */
    recalculateRepeatingWeapons = function () {
        getAttrs(["attk-effect-total", "dmg-effect-total", "DMG-mod"], function (v) {
            getSectionIDs("repeating_weapon", function (ids) {

                ids.forEach(function (id, index) {
                    var readField = "repeating_weapon_" + id + "_";
                    if (isBadRowId("weapon", id, false)) {
                        console.log("ERROR: recalculateRepeatingWeapons, invalid id:" + id + ", index:" + index);
                        return;
                    }
                    //console.log("TRACE: recalculateRepeatingWeapons id="+id);

                    SWUtils.setAttributeNumber(readField + "attk-effect-total-copy", (parseInt(v["attk-effect-total"], 10) || 0));
                    SWUtils.setAttributeNumber(readField + "dmg-effect-total-copy", (parseInt(v["dmg-effect-total"], 10) || 0));
                    SWUtils.setAttributeNumber(readField + "DMG-mod-copy", (parseInt(v["DMG-mod"], 10) || 0));
                    SWUtils.evaluateAndSetNumber(readField + "damage", readField + "damage-mod");
                    SWUtils.evaluateAndSetNumber(readField + "attack", readField + "attack-mod");
                    handleDropdown(readField + "attack-type", readField + "attack-type-mod");
                    handleRepeatingDamageDropdown(id);
                    updateRepeatingWeaponAttack(id);
                    updateRepeatingWeaponDamage(id);
                });
            });
        });
    },

    /* recalculateRepeatingMaxUsed
    * Parses the macro text "...max-calculation" in the repeating items (such as class-abilities, feats, traits, racial-traits)
    * and sets the used|max value.
    * Loops through all rows in the given repeating section.
    * @section {string}= the name of the section after the word "repeating_"
    */
    recalculateRepeatingMaxUsed = function (section) {
        getSectionIDs("repeating_" + section, function (ids) {
            ids.forEach(function (id, index) {
                var prefix = "repeating_" + section + "_" + id;
                if (isBadRowId(section, id, false)) {
                    console.log("ERROR: recalculateRepeatingMaxUsed, invalid id:" + id + ", index:" + index);
                    return;
                }
                SWUtils.evaluateAndSetNumber(prefix + "_max-calculation", prefix + "_used_max");
            });
        });
    },





    recalculateSkills = function () {
        handleDropdown("Acrobatics-ability", ["Acrobatics-ability-mod"]);
        handleDropdown("Artistry-ability", ["Artistry-ability-mod"]);
        handleDropdown("Appraise-ability", ["Appraise-ability-mod"]);
        handleDropdown("Bluff-ability", ["Bluff-ability-mod"]);
        handleDropdown("Climb-ability", ["Climb-ability-mod"]);
        handleDropdown("Craft-ability", ["Craft-ability-mod"]);
        handleDropdown("Craft2-ability", ["Craft2-ability-mod"]);
        handleDropdown("Craft3-ability", ["Craft3-ability-mod"]);
        handleDropdown("Diplomacy-ability", ["Diplomacy-ability-mod"]);
        handleDropdown("Disable-Device-ability", ["Disable-Device-ability-mod"]);
        handleDropdown("Disguise-ability", ["Disguise-ability-mod"]);
        handleDropdown("Escape-Artist-ability", ["Escape-Artist-ability-mod"]);
        handleDropdown("Fly-ability", ["Fly-ability-mod"]);
        handleDropdown("Handle-Animal-ability", ["Handle-Animal-ability-mod"]);
        handleDropdown("Heal-ability", ["Heal-ability-mod"]);
        handleDropdown("Intimidate-ability", ["Intimidate-ability-mod"]);
        handleDropdown("Linguistics-ability", ["Linguistics-ability-mod"]);
        handleDropdown("Lore-ability", ["Lore-ability-mod"]);
        handleDropdown("Knowledge-Arcana-ability", ["Knowledge-Arcana-ability-mod"]);
        handleDropdown("Knowledge-Dungeoneering-ability", ["Knowledge-Dungeoneering-ability-mod"]);
        handleDropdown("Knowledge-Engineering-ability", ["Knowledge-Engineering-ability-mod"]);
        handleDropdown("Knowledge-Geography-ability", ["Knowledge-Geography-ability-mod"]);
        handleDropdown("Knowledge-History-ability", ["Knowledge-History-ability-mod"]);
        handleDropdown("Knowledge-Local-ability", ["Knowledge-Local-ability-mod"]);
        handleDropdown("Knowledge-Nature-ability", ["Knowledge-Nature-ability-mod"]);
        handleDropdown("Knowledge-Nobility-ability", ["Knowledge-Nobility-ability-mod"]);
        handleDropdown("Knowledge-Planes-ability", ["Knowledge-Planes-ability-mod"]);
        handleDropdown("Knowledge-Religion-ability", ["Knowledge-Religion-ability-mod"]);
        handleDropdown("Perception-ability", ["Perception-ability-mod"]);
        handleDropdown("Perform-ability", ["Perform-ability-mod"]);
        handleDropdown("Perform2-ability", ["Perform2-ability-mod"]);
        handleDropdown("Perform3-ability", ["Perform3-ability-mod"]);
        handleDropdown("Profession-ability", ["Profession-ability-mod"]);
        handleDropdown("Profession2-ability", ["Profession2-ability-mod"]);
        handleDropdown("Profession3-ability", ["Profession3-ability-mod"]);
        handleDropdown("Ride-ability", ["Ride-ability-mod"]);
        handleDropdown("Sense-Motive-ability", ["Sense-Motive-ability-mod"]);
        handleDropdown("Sleight-of-Hand-ability", ["Sleight-of-Hand-ability-mod"]);
        handleDropdown("Spellcraft-ability", ["Spellcraft-ability-mod"]);
        handleDropdown("Stealth-ability", ["Stealth-ability-mod"]);
        handleDropdown("Survival-ability", ["Survival-ability-mod"]);
        handleDropdown("Swim-ability", ["Swim-ability-mod"]);
        handleDropdown("Use-Magic-Device-ability", ["Use-Magic-Device-ability-mod"]);
        handleDropdown("Misc-Skill-0-ability", ["Misc-Skill-0-ability-mod"]);
        handleDropdown("Misc-Skill-1-ability", ["Misc-Skill-1-ability-mod"]);
        handleDropdown("Misc-Skill-2-ability", ["Misc-Skill-2-ability-mod"]);
        handleDropdown("Misc-Skill-3-ability", ["Misc-Skill-3-ability-mod"]);
        handleDropdown("Misc-Skill-4-ability", ["Misc-Skill-4-ability-mod"]);
        handleDropdown("Misc-Skill-5-ability", ["Misc-Skill-5-ability-mod"]);
        handleDropdown("CS-Acrobatics-ability", ["CS-Acrobatics-ability-mod"]);
        handleDropdown("CS-Athletics-ability", ["CS-Athletics-ability-mod"]);
        handleDropdown("CS-Finesse-ability", ["CS-Finesse-ability-mod"]);
        handleDropdown("CS-Influence-ability", ["CS-Influence-ability-mod"]);
        handleDropdown("CS-Nature-ability", ["CS-Nature-ability-mod"]);
        handleDropdown("CS-Perception-ability", ["CS-Perception-ability-mod"]);
        handleDropdown("CS-Performance-ability", ["CS-Performance-ability-mod"]);
        handleDropdown("CS-Religion-ability", ["CS-Religion-ability-mod"]);
        handleDropdown("CS-Society-ability", ["CS-Society-ability-mod"]);
        handleDropdown("CS-Spellcraft-ability", ["CS-Spellcraft-ability-mod"]);
        handleDropdown("CS-Stealth-ability", ["CS-Stealth-ability-mod"]);
        handleDropdown("CS-Survival-ability", ["CS-Survival-ability-mod"]);

        updateSkill("Acrobatics");
        updateSkill("Appraise");
        updateSkill("Bluff");
        updateSkill("Climb");
        updateSkill("Craft");
        updateSkill("Craft2");
        updateSkill("Craft3");
        updateSkill("Diplomacy");
        updateSkill("Disable-Device");
        updateSkill("Disguise");
        updateSkill("Escape-Artist");
        updateSkill("Fly");
        updateSkill("Handle-Animal");
        updateSkill("Heal");
        updateSkill("Intimidate");
        updateSkill("Linguistics");
        updateSkill("Knowledge-Arcana");
        updateSkill("Knowledge-Dungeoneering");
        updateSkill("Knowledge-Engineering");
        updateSkill("Knowledge-Geography");
        updateSkill("Knowledge-History");
        updateSkill("Knowledge-Local");
        updateSkill("Knowledge-Nature");
        updateSkill("Knowledge-Nobility");
        updateSkill("Knowledge-Planes");
        updateSkill("Knowledge-Religion");
        updateSkill("Perception");
        updateSkill("Perform");
        updateSkill("Perform2");
        updateSkill("Perform3");
        updateSkill("Profession");
        updateSkill("Profession2");
        updateSkill("Profession3");
        updateSkill("Ride");
        updateSkill("Sense-Motive");
        updateSkill("Sleight-of-Hand");
        updateSkill("Spellcraft");
        updateSkill("Stealth");
        updateSkill("Survival");
        updateSkill("Swim");
        updateSkill("Use-Magic-Device");
        updateSkill("Misc-Skill-0");
        updateSkill("Misc-Skill-1");
        updateSkill("Misc-Skill-2");
        updateSkill("Misc-Skill-3");
        updateSkill("Misc-Skill-4");
        updateSkill("Misc-Skill-5");

        updateSkill("Artistry");
        updateSkill("Lore");

        updateSkill("CS-Acrobatics");
        updateSkill("CS-Athletics");
        updateSkill("CS-Finesse");
        updateSkill("CS-Influence");
        updateSkill("CS-Nature");
        updateSkill("CS-Perception");
        updateSkill("CS-Performance");
        updateSkill("CS-Religion");
        updateSkill("CS-Society");
        updateSkill("CS-Spellcraft");
        updateSkill("CS-Stealth");
        updateSkill("CS-Survival");
    },
	fixClassSkill = function (skill) {
	    var csNm = skill + "-cs";
	    getAttrs([csNm], function (v) {
	        var cs = 0, setter = {};
	        if (v[csNm] == "0") { cs = 0; }
	        else if (v[csNm]) { cs = 3; }
	        else if (!v[csNm]) { cs = 0; }
	        //console.log("FIXSKILL: "+skill+" : cs is "+cs + " raw is:"+v[csNm]);
	        if (cs === 3) {
	            setter[csNm] = cs;
	            setAttrs(setter);
	        }
	    });
	},

	fixClassSkills = function () {
	    fixClassSkill("Acrobatics");
	    fixClassSkill("Appraise");
	    fixClassSkill("Bluff");
	    fixClassSkill("Climb");
	    fixClassSkill("Craft");
	    fixClassSkill("Craft2");
	    fixClassSkill("Craft3");
	    fixClassSkill("Diplomacy");
	    fixClassSkill("Disable-Device");
	    fixClassSkill("Disguise");
	    fixClassSkill("Escape-Artist");
	    fixClassSkill("Fly");
	    fixClassSkill("Handle-Animal");
	    fixClassSkill("Heal");
	    fixClassSkill("Intimidate");
	    fixClassSkill("Linguistics");
	    fixClassSkill("Knowledge-Arcana");
	    fixClassSkill("Knowledge-Dungeoneering");
	    fixClassSkill("Knowledge-Engineering");
	    fixClassSkill("Knowledge-Geography");
	    fixClassSkill("Knowledge-History");
	    fixClassSkill("Knowledge-Local");
	    fixClassSkill("Knowledge-Nature");
	    fixClassSkill("Knowledge-Nobility");
	    fixClassSkill("Knowledge-Planes");
	    fixClassSkill("Knowledge-Religion");
	    fixClassSkill("Perception");
	    fixClassSkill("Perform");
	    fixClassSkill("Perform2");
	    fixClassSkill("Perform3");
	    fixClassSkill("Profession");
	    fixClassSkill("Profession2");
	    fixClassSkill("Profession3");
	    fixClassSkill("Ride");
	    fixClassSkill("Sense-Motive");
	    fixClassSkill("Sleight-of-Hand");
	    fixClassSkill("Spellcraft");
	    fixClassSkill("Stealth");
	    fixClassSkill("Survival");
	    fixClassSkill("Swim");
	    fixClassSkill("Use-Magic-Device");
	    fixClassSkill("Misc-Skill-0");
	    fixClassSkill("Misc-Skill-1");
	    fixClassSkill("Misc-Skill-2");
	    fixClassSkill("Misc-Skill-3");
	    fixClassSkill("Misc-Skill-4");
	    fixClassSkill("Misc-Skill-5");

	    fixClassSkill("Artistry");
	    fixClassSkill("Lore");

	    fixClassSkill("CS-Acrobatics");
	    fixClassSkill("CS-Athletics");
	    fixClassSkill("CS-Finesse");
	    fixClassSkill("CS-Influence");
	    fixClassSkill("CS-Nature");
	    fixClassSkill("CS-Perception");
	    fixClassSkill("CS-Performance");
	    fixClassSkill("CS-Religion");
	    fixClassSkill("CS-Society");
	    fixClassSkill("CS-Spellcraft");
	    fixClassSkill("CS-Stealth");
	    fixClassSkill("CS-Survival");
	},
    recalculateAllBuffs = function () {
        setAttrs({
            "buff_Melee-total": 0,
            "buff_Ranged-total": 0,
            "buff_DMG-total": 0,
            "buff_AC-total": 0,
            "buff_HP-temp-total": 0,
            "buff_Fort-total": 0,
            "buff_Ref-total": 0,
            "buff_Will-total": 0,
            "buff_STR-total": 0,
            "buff_DEX-total": 0,
            "buff_CON-total": 0,
            "buff_INT-total": 0,
            "buff_WIS-total": 0,
            "buff_CHA-total": 0,
            "buff_Touch-total": 0,
            "buff_CMD-total": 0,
            "buff_Check-total": 0,
            "buff_CasterLevel-total": 0
        });
        //not synchronous, but by the time these run the sets above should have run
        updateBuffRow("1");
        updateBuffRow("2");
        updateBuffRow("3");
        updateBuffRow("4");
        updateBuffRow("5");
        updateBuffRow("6");
        updateBuffRow("7");
        updateBuffRow("8");
        updateBuffRow("9");
        updateBuffRow("10");
        updateBuffColumn("STR");
        updateBuffColumn("DEX");
        updateBuffColumn("CON");
        updateBuffColumn("INT");
        updateBuffColumn("WIS");
        updateBuffColumn("CHA");
        updateBuffColumn("Ranged");
        updateBuffColumn("Melee");
        updateBuffColumn("DMG");
        updateBuffColumn("AC");
        updateBuffColumn("Fort");
        updateBuffColumn("Will");
        updateBuffColumn("Ref");
        updateBuffColumn("HP-temp");
        updateBuffColumn("Touch");
        updateBuffColumn("CMD");
        updateBuffColumn("Check");
        updateBuffColumn("CasterLevel");
    },
    recalculateSheet = function (oldversion) {
        if (oldversion < 0.15) {


            updateAbility("STR");
            updateAbility("DEX");
            updateAbility("CON");
            updateAbility("INT");
            updateAbility("WIS");
            updateAbility("CHA");

            handleDropdown("HP-ability", ["HP-ability-mod"]);
            //init dropdown
            handleDropdown("init-ability", ["init-ability-mod"]);
            //saves
            handleDropdown("Fort-ability", ["Fort-ability-mod"]);
            handleDropdown("Ref-ability", ["Ref-ability-mod"]);
            handleDropdown("Will-ability", ["Will-ability-mod"]);
            //defense dropdowns
            handleDropdown("AC-ability", ["AC-ability-mod"]);
            handleDropdown("FF-ability", ["FF-DEX"]);
            handleDropdown("CMD-ability1", ["CMD-STR"]);
            handleDropdown("CMD-ability2", ["CMD-DEX"]);
            handleDropdown("CMD-ability", ["FF-CMD-DEX"]);
            //attack non repeating dropdowns
            handleDropdown("melee-ability", ["melee-ability-mod"]);
            handleDropdown("ranged-ability", ["ranged-ability-mod"]);
            handleDropdown("CMB-ability", ["CMB-ability-mod"]);


            updateSize();
            updateInit();
            SWUtils.evaluateAndSetNumber("HP-formula-macro-text", "HP-formula-mod");
            updateHP();
            updateTempHP();
            SWUtils.evaluateAndSetNumber("NPC-HD-misc", "NPC-HD-misc-mod");
            updateNPCHP();
            updateClassInformation("hp");
            updateClassInformation("skill");
            updateClassInformation("fcskill");
            updateClassInformation("fcalt");
            updateClassInformation("bab");
            updateClassInformation("Fort");
            updateClassInformation("Ref");
            updateClassInformation("Will");
            updateClassInformation("level");

            updateSave("Fort");
            updateSave("Ref");
            updateSave("Will");
            updateConditionDefensePenalty();
            updateDefenses();
            updateArmor();
            updateConditionAttackPenalty();
            updateAttack("melee");
            updateAttack("ranged");
            updateAttack("CMB");
            recalculateRepeatingWeapons();

        }
        if (oldversion < 0.16) {

            SWUtils.evaluateAndSetNumber("Max-Skill-Ranks-Misc", "Max-Skill-Ranks-mod");
            updateMaxSkills();

            updateConditionCheckPenalty();
            recalculateSkills();
            updateConditionAbilityPenalty();
        }
        if (oldversion < 0.17) {
            //buff and skills fixed in 0.17
            recalculateAllBuffs();
            updateSkill("CS-Perception");
            updateConditionAbilityPenalty();
            recalculateRepeatingMaxUsed("class-ability");
            recalculateRepeatingMaxUsed("feat");
            recalculateRepeatingMaxUsed("racial-trait");
            recalculateRepeatingMaxUsed("trait");
        }
        if (oldversion < 0.18) {
            fixClassSkills();
        }
        if (oldversion < 0.19) {
            updateDamage();
            updateDamageNote();
        }
        if (oldversion < 0.20) {
            recalculateRepeatingWeapons();
            handleRepeatingRowOrdering("class-ability", true);
            handleRepeatingRowOrdering("feat", true);
            handleRepeatingRowOrdering("racial-trait", true);
            handleRepeatingRowOrdering("trait", true);
            handleRepeatingRowOrdering("item", true);
        }
        if (oldversion < 0.21) {
            handleDefenseDropdown("FF-ability");
            handleDefenseDropdown("CMD-ability");
            handleDefenseDropdown("AC-ability");
            handleDefenseDropdown("CMD-ability2");
            handleDefenseDropdown("CMD-ability1");
            updateDefenses();
        }
        if (oldversion < 0.30) {

            handleConcentrationAbilityDropdown(0);
            handleConcentrationAbilityDropdown(1);
            handleConcentrationAbilityDropdown(2);
            updateCasterLevel(0);
            updateCasterLevel(1);
            updateCasterLevel(2);
            updateConcentration(0);
            updateConcentration(1);
            updateConcentration(2);
            updateSaveDCs(0);
            updateSaveDCs(1);
            updateSaveDCs(2);
            recalculateSpellLevelsAll();

            updateBonusSpells(0);
            updateBonusSpells(1);
            updateBonusSpells(2);
            handleRepeatingRowOrdering("lvl-0-spells", true);
            handleRepeatingRowOrdering("lvl-1-spells", true);
            handleRepeatingRowOrdering("lvl-2-spells", true);
            handleRepeatingRowOrdering("lvl-3-spells", true);
            handleRepeatingRowOrdering("lvl-4-spells", true);
            handleRepeatingRowOrdering("lvl-5-spells", true);
            handleRepeatingRowOrdering("lvl-6-spells", true);
            handleRepeatingRowOrdering("lvl-7-spells", true);
            handleRepeatingRowOrdering("lvl-8-spells", true);
            handleRepeatingRowOrdering("lvl-9-spells", true);
            handleRepeatingRowOrdering("npc-spell-like-abilities", true);
            handleRepeatingRowOrdering("npc-spells1", true);
            handleRepeatingRowOrdering("npc-spells2", true);
        }
        if (oldversion < 0.31) {
            updateConditionCheckPenalty();
            updateConditionDefensePenalty();
            updateCasterLevel(0);
            updateCasterLevel(1);
            updateCasterLevel(2);
            updateConcentration(0);
            updateConcentration(1);
            updateConcentration(2);
        }
    },

	//recalculate section



    checkForUpdate = function () {
        getAttrs(["PFSheet_Version", "PFSheet_forcesync", "recalc1"], function (v) {
            var setter = {}, currVer = 0, setAny = 0, recalc = false;
            currVer = parseFloat(v["PFSheet_Version"], 10) || 0;
            console.log("Current Pathfinder sheet data version:" + currVer + ", Sheet code version:" + version);

            if (currVer !== version) {
                recalc = true;
                setter["PFSheet_Version"] = version;
                setAny = 1;
            }
            if (v["recalc1"] && v["recalc1"] != "0") {
                currVer = -1;
                recalc = true;
                setter["recalc1"] = 0;
                setAny = 1;
            }
            if (v["PFSheet_forcesync"] && v["PFSheet_forcesync"] != "0") {
                currVer = -1;
                recalc = true;
                setter["PFSheet_forcesync"] = 0;
                setAny = 1;
            }
            if (setAny) {
                setAttrs(setter);
            }
            if (recalc) {
                recalculateSheet(currVer);
            }
        });
    };

    return {
        util: {
            findAbilityInString: findAbilityInString,
            findMultiplier: findMultiplier,

            updateRowTotal: updateRowTotal,

            isBadRowId: isBadRowId
        },
        version: version,
        handleDropdown: handleDropdown,
        updateSize: updateSize,
        updateAbility: updateAbility,
        updateGrapple: updateGrapple,
        updatePin: updatePin,
        updateBuff: updateBuff,
        updateBuffRow: updateBuffRow,
        updateBuffColumn: updateBuffColumn,
        updateInit: updateInit,
        updateHP: updateHP,
        updateTempHP: updateTempHP,
        updateClassInformation: updateClassInformation,
        updateMythicPathInformation: updateMythicPathInformation,
        updateMythicPower: updateMythicPower,
        updateTierMythicPower: updateTierMythicPower,
        updateDefenses: updateDefenses,
        updateArmor: updateArmor,
        updateAttackEffectTotals: updateAttackEffectTotals,
        updateDMGEffectTotals: updateDMGEffectTotals,
        updateConditionsSavePenalty: updateConditionsSavePenalty,
        updateSave: updateSave,
        updateConditionDefensePenalty: updateConditionDefensePenalty,
        handleDefenseDropdown: handleDefenseDropdown,
        updateAttack: updateAttack,
        updateDamage: updateDamage,
        updateDamageNote: updateDamageNote,
        updateConditionAttackPenalty: updateConditionAttackPenalty,
        updateConditionAttackNote: updateConditionAttackNote,
        handleRepeatingDamageDropdown: handleRepeatingDamageDropdown,
        handleRepeatingAttackDropdown: handleRepeatingAttackDropdown,
        updateRepeatingWeaponAttack: updateRepeatingWeaponAttack,
        updateRepeatingWeaponDamage: updateRepeatingWeaponDamage,
        updateRepeatingWeaponAttacks: updateRepeatingWeaponAttacks,
        updateRepeatingWeaponDamages: updateRepeatingWeaponDamages,
        updateConditionCheckPenalty: updateConditionCheckPenalty,
        updateConditionAbilityPenalty: updateConditionAbilityPenalty,
        updateMaxSkills: updateMaxSkills,
        updateSkill: updateSkill,
        updateNPCHP: updateNPCHP,
        handleSpellClassDropdown: handleSpellClassDropdown,
        updateConcentration: updateConcentration,
        updateCasterLevel: updateCasterLevel,
        ifSpellClassExists: ifSpellClassExists,
        updateSpellPenetration: updateSpellPenetration,
        updateMaxSpellsPerDay: updateMaxSpellsPerDay,
        updateSpellClassLevel: updateSpellClassLevel,
        updateSaveDCs: updateSaveDCs,
        updateBonusSpells: updateBonusSpells,
        handleConcentrationAbilityDropdown: handleConcentrationAbilityDropdown,
        updateCastingPenaltyNote: updateCastingPenaltyNote,
        updateSpell: updateSpell,
        updateSpells: updateSpells,
        checkIsNewRow: checkIsNewRow,

        checkForUpdate: checkForUpdate
    };
}());



//Buffs - columns
on("change:buff1_str change:buff2_str change:buff3_str change:buff4_str change:buff5_str change:buff6_str change:buff7_str change:buff8_str change:buff9_str change:buff10_str", function () { PFSheet.updateBuffColumn("STR"); });
on("change:buff1_dex change:buff2_dex change:buff3_dex change:buff4_dex change:buff5_dex change:buff6_dex change:buff7_dex change:buff8_dex change:buff9_dex change:buff10_dex", function () { PFSheet.updateBuffColumn("DEX"); });
on("change:buff1_con change:buff2_con change:buff3_con change:buff4_con change:buff5_con change:buff6_con change:buff7_con change:buff8_con change:buff9_con change:buff10_con", function () { PFSheet.updateBuffColumn("CON"); });
on("change:buff1_int change:buff2_int change:buff3_int change:buff4_int change:buff5_int change:buff6_int change:buff7_int change:buff8_int change:buff9_int change:buff10_int", function () { PFSheet.updateBuffColumn("INT"); });
on("change:buff1_wis change:buff2_wis change:buff3_wis change:buff4_wis change:buff5_wis change:buff6_wis change:buff7_wis change:buff8_wis change:buff9_wis change:buff10_wis", function () { PFSheet.updateBuffColumn("WIS"); });
on("change:buff1_cha change:buff2_cha change:buff3_cha change:buff4_cha change:buff5_cha change:buff6_cha change:buff7_cha change:buff8_cha change:buff9_cha change:buff10_cha", function () { PFSheet.updateBuffColumn("CHA"); });
on("change:buff1_melee change:buff2_melee change:buff3_melee change:buff4_melee change:buff5_melee change:buff6_melee change:buff7_melee change:buff8_melee change:buff9_melee change:buff10_melee", function () { PFSheet.updateBuffColumn("Melee"); });
on("change:buff1_ranged change:buff2_ranged change:buff3_ranged change:buff4_ranged change:buff5_ranged change:buff6_ranged change:buff7_ranged change:buff8_ranged change:buff9_ranged change:buff10_ranged", function () { PFSheet.updateBuffColumn("Ranged"); });
on("change:buff1_dmg change:buff2_dmg change:buff3_dmg change:buff4_dmg change:buff5_dmg change:buff6_dmg change:buff7_dmg change:buff8_dmg change:buff9_dmg change:buff10_dmg", function () { PFSheet.updateBuffColumn("DMG"); });
on("change:buff1_ac change:buff2_ac change:buff3_ac change:buff4_ac change:buff5_ac change:buff6_ac change:buff7_ac change:buff8_ac change:buff9_ac change:buff10_ac", function () { PFSheet.updateBuffColumn("AC"); });
on("change:buff1_hp-temp change:buff2_hp-temp change:buff3_hp-temp change:buff4_hp-temp change:buff5_hp-temp change:buff6_hp-temp change:buff7_hp-temp change:buff8_hp-temp change:buff9_hp-temp change:buff10_hp-temp", function () { PFSheet.updateBuffColumn("HP-temp"); });
on("change:buff1_fort change:buff2_fort change:buff3_fort change:buff4_fort change:buff5_fort change:buff6_fort change:buff7_fort change:buff8_fort change:buff9_fort change:buff10_fort", function () { PFSheet.updateBuffColumn("Fort"); });
on("change:buff1_ref change:buff2_ref change:buff3_ref change:buff4_ref change:buff5_ref change:buff6_ref change:buff7_ref change:buff8_ref change:buff9_ref change:buff10_ref", function () { PFSheet.updateBuffColumn("Ref"); });
on("change:buff1_will change:buff2_will change:buff3_will change:buff4_will change:buff5_will change:buff6_will change:buff7_will change:buff8_will change:buff9_will change:buff10_will", function () { PFSheet.updateBuffColumn("Will"); });
on("change:buff1_casterlevel change:buff2_casterlevel change:buff3_casterlevel change:buff4_casterlevel change:buff5_casterlevel change:buff6_casterlevel change:buff7_casterlevel change:buff8_casterlevel change:buff9_casterlevel change:buff10_casterlevel", function () { PFSheet.updateBuffColumn("CasterLevel"); });
on("change:buff1_check change:buff2_check change:buff3_check change:buff4_check change:buff5_check change:buff6_check change:buff7_check change:buff8_check change:buff9_check change:buff10_check", function () { PFSheet.updateBuffColumn("Check"); });
on("change:buff1_touch change:buff2_touch change:buff3_touch change:buff4_touch change:buff5_touch change:buff6_touch change:buff7_touch change:buff8_touch change:buff9_touch change:buff10_touch", function () { PFSheet.updateBuffColumn("Touch"); });
on("change:buff1_cmd change:buff2_cmd change:buff3_cmd change:buff4_cmd change:buff5_cmd change:buff6_cmd change:buff7_cmd change:buff8_cmd change:buff9_cmd change:buff10_cmd", function () { PFSheet.updateBuffColumn("CMD"); });

//Buffs - rows
on("change:buff1_toggle", function () { PFSheet.updateBuffRow("1"); });
on("change:buff2_toggle", function () { PFSheet.updateBuffRow("2"); });
on("change:buff3_toggle", function () { PFSheet.updateBuffRow("3"); });
on("change:buff4_toggle", function () { PFSheet.updateBuffRow("4"); });
on("change:buff5_toggle", function () { PFSheet.updateBuffRow("5"); });
on("change:buff6_toggle", function () { PFSheet.updateBuffRow("6"); });
on("change:buff7_toggle", function () { PFSheet.updateBuffRow("7"); });
on("change:buff8_toggle", function () { PFSheet.updateBuffRow("8"); });
on("change:buff9_toggle", function () { PFSheet.updateBuffRow("9"); });
on("change:buff10_toggle", function () { PFSheet.updateBuffRow("10"); });

//Buffs - cells
on("change:buff1_melee_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("Melee", "1"); } }); });
on("change:buff1_ranged_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("Ranged", "1"); } }); });
on("change:buff1_dmg_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("DMG", "1"); } }); });
on("change:buff1_ac_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("AC", "1"); } }); });
on("change:buff1_hp-temp_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("HP-temp", "1"); } }); });
on("change:buff1_fort_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("Fort", "1"); } }); });
on("change:buff1_ref_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("Ref", "1"); } }); });
on("change:buff1_will_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("Will", "1"); } }); });
on("change:buff1_str_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("STR", "1"); } }); });
on("change:buff1_dex_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("DEX", "1"); } }); });
on("change:buff1_con_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("CON", "1"); } }); });
on("change:buff1_int_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("INT", "1"); } }); });
on("change:buff1_wis_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("WIS", "1"); } }); });
on("change:buff1_cha_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("CHA", "1"); } }); });
on("change:buff1_touch_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("Touch", "1"); } }); });
on("change:buff1_cmd_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("CMD", "1"); } }); });
on("change:buff1_check_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("Check", "1"); } }); });
on("change:buff1_casterlevel_macro-text", function () { getAttrs(["buff1_Toggle"], function (v) { if (v.buff1_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "1"); } }); });


on("change:buff2_melee_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("Melee", "2"); } }); });
on("change:buff2_ranged_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("Ranged", "2"); } }); });
on("change:buff2_dmg_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("DMG", "2"); } }); });
on("change:buff2_ac_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("AC", "2"); } }); });
on("change:buff2_hp-temp_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("HP-temp", "2"); } }); });
on("change:buff2_fort_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("Fort", "2"); } }); });
on("change:buff2_ref_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("Ref", "2"); } }); });
on("change:buff2_will_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("Will", "2"); } }); });
on("change:buff2_str_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("STR", "2"); } }); });
on("change:buff2_dex_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("DEX", "2"); } }); });
on("change:buff2_con_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("CON", "2"); } }); });
on("change:buff2_int_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("INT", "2"); } }); });
on("change:buff2_wis_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("WIS", "2"); } }); });
on("change:buff2_cha_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle == "1") { PFSheet.updateBuff("CHA", "2"); } }); });
on("change:buff2_touch_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle === "1") { PFSheet.updateBuff("Touch", "2"); } }); });
on("change:buff2_cmd_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle === "1") { PFSheet.updateBuff("CMD", "2"); } }); });
on("change:buff2_check_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle === "1") { PFSheet.updateBuff("Check", "2"); } }); });
on("change:buff2_casterlevel_macro-text", function () { getAttrs(["buff2_Toggle"], function (v) { if (v.buff2_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "2"); } }); });

on("change:buff3_melee_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("Melee", "3"); } }); });
on("change:buff3_ranged_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("Ranged", "3"); } }); });
on("change:buff3_dmg_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("DMG", "3"); } }); });
on("change:buff3_ac_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("AC", "3"); } }); });
on("change:buff3_hp-temp_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("HP-temp", "3"); } }); });
on("change:buff3_fort_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("Fort", "3"); } }); });
on("change:buff3_ref_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("Ref", "3"); } }); });
on("change:buff3_will_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("Will", "3"); } }); });
on("change:buff3_str_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("STR", "3"); } }); });
on("change:buff3_dex_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("DEX", "3"); } }); });
on("change:buff3_con_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("CON", "3"); } }); });
on("change:buff3_int_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("INT", "3"); } }); });
on("change:buff3_wis_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("WIS", "3"); } }); });
on("change:buff3_cha_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle == "1") { PFSheet.updateBuff("CHA", "3"); } }); });
on("change:buff3_touch_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle === "1") { PFSheet.updateBuff("Touch", "3"); } }); });
on("change:buff3_cmd_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle === "1") { PFSheet.updateBuff("CMD", "3"); } }); });
on("change:buff3_check_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle === "1") { PFSheet.updateBuff("Check", "3"); } }); });
on("change:buff3_casterlevel_macro-text", function () { getAttrs(["buff3_Toggle"], function (v) { if (v.buff3_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "3"); } }); });

on("change:buff4_melee_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("Melee", "4"); } }); });
on("change:buff4_ranged_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("Ranged", "4"); } }); });
on("change:buff4_dmg_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("DMG", "4"); } }); });
on("change:buff4_ac_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("AC", "4"); } }); });
on("change:buff4_hp-temp_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("HP-temp", "4"); } }); });
on("change:buff4_fort_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("Fort", "4"); } }); });
on("change:buff4_ref_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("Ref", "4"); } }); });
on("change:buff4_will_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("Will", "4"); } }); });
on("change:buff4_str_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("STR", "4"); } }); });
on("change:buff4_dex_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("DEX", "4"); } }); });
on("change:buff4_con_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("CON", "4"); } }); });
on("change:buff4_int_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("INT", "4"); } }); });
on("change:buff4_wis_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("WIS", "4"); } }); });
on("change:buff4_cha_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle == "1") { PFSheet.updateBuff("CHA", "4"); } }); });
on("change:buff4_touch_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle === "1") { PFSheet.updateBuff("Touch", "4"); } }); });
on("change:buff4_cmd_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle === "1") { PFSheet.updateBuff("CMD", "4"); } }); });
on("change:buff4_check_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle === "1") { PFSheet.updateBuff("Check", "4"); } }); });
on("change:buff4_casterlevel_macro-text", function () { getAttrs(["buff4_Toggle"], function (v) { if (v.buff4_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "4"); } }); });

on("change:buff5_melee_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("Melee", "5"); } }); });
on("change:buff5_ranged_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("Ranged", "5"); } }); });
on("change:buff5_dmg_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("DMG", "5"); } }); });
on("change:buff5_ac_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("AC", "5"); } }); });
on("change:buff5_hp-temp_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("HP-temp", "5"); } }); });
on("change:buff5_fort_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("Fort", "5"); } }); });
on("change:buff5_ref_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("Ref", "5"); } }); });
on("change:buff5_will_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("Will", "5"); } }); });
on("change:buff5_str_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("STR", "5"); } }); });
on("change:buff5_dex_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("DEX", "5"); } }); });
on("change:buff5_con_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("CON", "5"); } }); });
on("change:buff5_int_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("INT", "5"); } }); });
on("change:buff5_wis_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("WIS", "5"); } }); });
on("change:buff5_cha_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle == "1") { PFSheet.updateBuff("CHA", "5"); } }); });
on("change:buff5_touch_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle === "1") { PFSheet.updateBuff("Touch", "5"); } }); });
on("change:buff5_cmd_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle === "1") { PFSheet.updateBuff("CMD", "5"); } }); });
on("change:buff5_check_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle === "1") { PFSheet.updateBuff("Check", "5"); } }); });
on("change:buff5_casterlevel_macro-text", function () { getAttrs(["buff5_Toggle"], function (v) { if (v.buff5_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "5"); } }); });

on("change:buff6_melee_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("Melee", "6"); } }); });
on("change:buff6_ranged_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("Ranged", "6"); } }); });
on("change:buff6_dmg_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("DMG", "6"); } }); });
on("change:buff6_ac_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("AC", "6"); } }); });
on("change:buff6_hp-temp_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("HP-temp", "6"); } }); });
on("change:buff6_fort_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("Fort", "6"); } }); });
on("change:buff6_ref_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("Ref", "6"); } }); });
on("change:buff6_will_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("Will", "6"); } }); });
on("change:buff6_str_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("STR", "6"); } }); });
on("change:buff6_dex_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("DEX", "6"); } }); });
on("change:buff6_con_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("CON", "6"); } }); });
on("change:buff6_int_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("INT", "6"); } }); });
on("change:buff6_wis_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("WIS", "6"); } }); });
on("change:buff6_cha_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle == "1") { PFSheet.updateBuff("CHA", "6"); } }); });
on("change:buff6_touch_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle === "1") { PFSheet.updateBuff("Touch", "6"); } }); });
on("change:buff6_cmd_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle === "1") { PFSheet.updateBuff("CMD", "6"); } }); });
on("change:buff6_check_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle === "1") { PFSheet.updateBuff("Check", "6"); } }); });
on("change:buff6_casterlevel_macro-text", function () { getAttrs(["buff6_Toggle"], function (v) { if (v.buff6_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "6"); } }); });

on("change:buff7_melee_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("Melee", "7"); } }); });
on("change:buff7_ranged_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("Ranged", "7"); } }); });
on("change:buff7_dmg_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("DMG", "7"); } }); });
on("change:buff7_ac_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("AC", "7"); } }); });
on("change:buff7_hp-temp_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("HP-temp", "7"); } }); });
on("change:buff7_fort_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("Fort", "7"); } }); });
on("change:buff7_ref_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("Ref", "7"); } }); });
on("change:buff7_will_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("Will", "7"); } }); });
on("change:buff7_str_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("STR", "7"); } }); });
on("change:buff7_dex_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("DEX", "7"); } }); });
on("change:buff7_con_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("CON", "7"); } }); });
on("change:buff7_int_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("INT", "7"); } }); });
on("change:buff7_wis_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("WIS", "7"); } }); });
on("change:buff7_cha_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle == "1") { PFSheet.updateBuff("CHA", "7"); } }); });
on("change:buff7_touch_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle === "1") { PFSheet.updateBuff("Touch", "7"); } }); });
on("change:buff7_cmd_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle === "1") { PFSheet.updateBuff("CMD", "7"); } }); });
on("change:buff7_check_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle === "1") { PFSheet.updateBuff("Check", "7"); } }); });
on("change:buff7_casterlevel_macro-text", function () { getAttrs(["buff7_Toggle"], function (v) { if (v.buff7_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "7"); } }); });

on("change:buff8_melee_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("Melee", "8"); } }); });
on("change:buff8_ranged_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("Ranged", "8"); } }); });
on("change:buff8_dmg_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("DMG", "8"); } }); });
on("change:buff8_ac_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("AC", "8"); } }); });
on("change:buff8_hp-temp_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("HP-temp", "8"); } }); });
on("change:buff8_fort_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("Fort", "8"); } }); });
on("change:buff8_ref_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("Ref", "8"); } }); });
on("change:buff8_will_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("Will", "8"); } }); });
on("change:buff8_str_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("STR", "8"); } }); });
on("change:buff8_dex_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("DEX", "8"); } }); });
on("change:buff8_con_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("CON", "8"); } }); });
on("change:buff8_int_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("INT", "8"); } }); });
on("change:buff8_wis_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("WIS", "8"); } }); });
on("change:buff8_cha_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle == "1") { PFSheet.updateBuff("CHA", "8"); } }); });
on("change:buff8_touch_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle === "1") { PFSheet.updateBuff("Touch", "8"); } }); });
on("change:buff8_cmd_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle === "1") { PFSheet.updateBuff("CMD", "8"); } }); });
on("change:buff8_check_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle === "1") { PFSheet.updateBuff("Check", "8"); } }); });
on("change:buff8_casterlevel_macro-text", function () { getAttrs(["buff8_Toggle"], function (v) { if (v.buff8_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "8"); } }); });

on("change:buff9_melee_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("Melee", "9"); } }); });
on("change:buff9_ranged_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("Ranged", "9"); } }); });
on("change:buff9_dmg_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("DMG", "9"); } }); });
on("change:buff9_ac_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("AC", "9"); } }); });
on("change:buff9_hp-temp_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("HP-temp", "9"); } }); });
on("change:buff9_fort_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("Fort", "9"); } }); });
on("change:buff9_ref_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("Ref", "9"); } }); });
on("change:buff9_will_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("Will", "9"); } }); });
on("change:buff9_str_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("STR", "9"); } }); });
on("change:buff9_dex_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("DEX", "9"); } }); });
on("change:buff9_con_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("CON", "9"); } }); });
on("change:buff9_int_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("INT", "9"); } }); });
on("change:buff9_wis_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("WIS", "9"); } }); });
on("change:buff9_cha_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle == "1") { PFSheet.updateBuff("CHA", "9"); } }); });
on("change:buff9_touch_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle === "1") { PFSheet.updateBuff("Touch", "9"); } }); });
on("change:buff9_cmd_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle === "1") { PFSheet.updateBuff("CMD", "9"); } }); });
on("change:buff9_check_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle === "1") { PFSheet.updateBuff("Check", "9"); } }); });
on("change:buff9_casterlevel_macro-text", function () { getAttrs(["buff9_Toggle"], function (v) { if (v.buff9_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "9"); } }); });

on("change:buff10_melee_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("Melee", "10"); } }); });
on("change:buff10_ranged_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("Ranged", "10"); } }); });
on("change:buff10_dmg_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("DMG", "10"); } }); });
on("change:buff10_ac_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("AC", "10"); } }); });
on("change:buff10_hp-temp_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("HP-temp", "10"); } }); });
on("change:buff10_fort_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("Fort", "10"); } }); });
on("change:buff10_ref_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("Ref", "10"); } }); });
on("change:buff10_will_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("Will", "10"); } }); });
on("change:buff10_str_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("STR", "10"); } }); });
on("change:buff10_dex_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("DEX", "10"); } }); });
on("change:buff10_con_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("CON", "10"); } }); });
on("change:buff10_int_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("INT", "10"); } }); });
on("change:buff10_wis_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("WIS", "10"); } }); });
on("change:buff10_cha_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle == "1") { PFSheet.updateBuff("CHA", "10"); } }); });
on("change:buff10_touch_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle === "1") { PFSheet.updateBuff("Touch", "10"); } }); });
on("change:buff10_cmd_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle === "1") { PFSheet.updateBuff("CMD", "10"); } }); });
on("change:buff10_check_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle === "1") { PFSheet.updateBuff("Check", "10"); } }); });
on("change:buff10_casterlevel_macro-text", function () { getAttrs(["buff10_Toggle"], function (v) { if (v.buff10_Toggle === "1") { PFSheet.updateBuff("CasterLevel", "10"); } }); });


//allskills



on("change:acrobatics-ability", function () { PFSheet.handleDropdown("Acrobatics-ability", ["Acrobatics-ability-mod"]); });
on("change:acp change:acrobatics-cs change:acrobatics-ranks change:acrobatics-class change:checks-cond change:acrobatics-ability-mod change:acrobatics-racial change:acrobatics-feat change:acrobatics-item change:acrobatics-size change:acrobatics-acp change:acrobatics-misc change:acrobatics-ReqTrain"
   , function () { PFSheet.updateSkill("Acrobatics"); });

on("change:artistry-ability", function () { PFSheet.handleDropdown("Artistry-ability", ["Artistry-ability-mod"]); });
on("change:artistry-cs change:artistry-ranks change:artistry-class change:checks-cond change:artistry-ability-mod change:artistry-racial change:artistry-feat change:artistry-item change:artistry-size change:artistry-acp change:artistry-misc change:artistry-ReqTrain"
   , function () { PFSheet.updateSkill("Artistry"); });

on("change:appraise-ability", function () { PFSheet.handleDropdown("Appraise-ability", ["Appraise-ability-mod"]); });
on("change:appraise-cs change:appraise-ranks change:appraise-class change:checks-cond change:appraise-ability-mod change:appraise-racial change:appraise-feat change:appraise-item change:appraise-size change:appraise-acp change:appraise-misc change:appraise-ReqTrain"
   , function () { PFSheet.updateSkill("Appraise"); });

on("change:bluff-ability", function () { PFSheet.handleDropdown("Bluff-ability", ["Bluff-ability-mod"]); });
on("change:bluff-cs change:bluff-ranks change:bluff-class change:checks-cond change:bluff-ability-mod change:bluff-racial change:bluff-feat change:bluff-item change:bluff-size change:bluff-acp change:bluff-misc change:bluff-ReqTrain"
   , function () { PFSheet.updateSkill("Bluff"); });

on("change:climb-ability", function () { PFSheet.handleDropdown("Climb-ability", ["Climb-ability-mod"]); });
on("change:acp change:climb-cs change:climb-ranks change:climb-class change:checks-cond change:climb-ability-mod change:climb-racial change:climb-feat change:climb-item change:climb-size change:climb-acp change:climb-misc change:climb-ReqTrain"
   , function () { PFSheet.updateSkill("Climb"); });

on("change:craft-ability", function () { PFSheet.handleDropdown("Craft-ability", ["Craft-ability-mod"]); });
on("change:craft-cs change:craft-ranks change:craft-class change:checks-cond change:craft-ability-mod change:craft-racial change:craft-feat change:craft-item change:craft-size change:craft-acp change:craft-misc change:craft-ReqTrain"
   , function () { PFSheet.updateSkill("Craft"); });

on("change:craft2-ability", function () { PFSheet.handleDropdown("Craft2-ability", ["Craft2-ability-mod"]); });
on("change:craft2-cs change:craft2-ranks change:craft2-class change:checks-cond change:craft2-ability-mod change:craft2-racial change:craft2-feat change:craft2-item change:craft2-size change:craft2-acp change:craft2-misc change:craft2-ReqTrain"
   , function () { PFSheet.updateSkill("Craft2"); });

on("change:craft3-ability", function () { PFSheet.handleDropdown("Craft3-ability", ["Craft3-ability-mod"]); });
on("change:craft3-cs change:craft3-ranks change:craft3-class change:checks-cond change:craft3-ability-mod change:craft3-racial change:craft3-feat change:craft3-item change:craft3-size change:craft3-acp change:craft3-misc change:craft3-ReqTrain"
   , function () { PFSheet.updateSkill("Craft3"); });

on("change:diplomacy-ability", function () { PFSheet.handleDropdown("Diplomacy-ability", ["Diplomacy-ability-mod"]); });
on("change:diplomacy-cs change:diplomacy-ranks change:diplomacy-class change:checks-cond change:diplomacy-ability-mod change:diplomacy-racial change:diplomacy-feat change:diplomacy-item change:diplomacy-size change:diplomacy-acp change:diplomacy-misc change:diplomacy-ReqTrain"
   , function () { PFSheet.updateSkill("Diplomacy"); });

on("change:disable-Device-ability", function () { PFSheet.handleDropdown("Disable-Device-ability", ["Disable-Device-ability-mod"]); });
on("change:acp change:disable-Device-cs change:disable-Device-ranks change:disable-Device-class change:checks-cond change:disable-Device-ability-mod change:disable-Device-racial change:disable-Device-feat change:disable-Device-item change:disable-Device-size change:disable-Device-acp change:disable-Device-misc change:disable-Device-ReqTrain"
   , function () { PFSheet.updateSkill("Disable-Device"); });

on("change:disguise-ability", function () { PFSheet.handleDropdown("Disguise-ability", ["Disguise-ability-mod"]); });
on("change:disguise-cs change:disguise-ranks change:disguise-class change:checks-cond change:disguise-ability-mod change:disguise-racial change:disguise-feat change:disguise-item change:disguise-size change:disguise-acp change:disguise-misc change:disguise-ReqTrain"
   , function () { PFSheet.updateSkill("Disguise"); });

on("change:escape-Artist-ability", function () { PFSheet.handleDropdown("Escape-Artist-ability", ["Escape-Artist-ability-mod"]); });
on("change:acp change:escape-Artist-cs change:escape-Artist-ranks change:escape-Artist-class change:checks-cond change:escape-Artist-ability-mod change:escape-Artist-racial change:escape-Artist-feat change:escape-Artist-item change:escape-Artist-size change:escape-Artist-acp change:escape-Artist-misc change:escape-Artist-ReqTrain"
   , function () { PFSheet.updateSkill("Escape-Artist"); });

on("change:fly-ability", function () { PFSheet.handleDropdown("Fly-ability", ["Fly-ability-mod"]); });
on("change:acp change:size_skill change:fly-cs change:fly-ranks change:fly-class change:checks-cond change:fly-ability-mod change:fly-racial change:fly-feat change:fly-item change:fly-size change:fly-acp change:fly-misc change:fly-ReqTrain"
   , function () { PFSheet.updateSkill("Fly"); });

on("change:handle-Animal-ability", function () { PFSheet.handleDropdown("Handle-Animal-ability", ["Handle-Animal-ability-mod"]); });
on("change:handle-Animal-cs change:handle-Animal-ranks change:handle-Animal-class change:checks-cond change:handle-Animal-ability-mod change:handle-Animal-racial change:handle-Animal-feat change:handle-Animal-item change:handle-Animal-size change:handle-Animal-acp change:handle-Animal-misc change:handle-Animal-ReqTrain"
   , function () { PFSheet.updateSkill("Handle-Animal"); });

on("change:heal-ability", function () { PFSheet.handleDropdown("Heal-ability", ["Heal-ability-mod"]); });
on("change:heal-cs change:heal-ranks change:heal-class change:checks-cond change:heal-ability-mod change:heal-racial change:heal-feat change:heal-item change:heal-size change:heal-acp change:heal-misc change:heal-ReqTrain"
   , function () { PFSheet.updateSkill("Heal"); });

on("change:intimidate-ability", function () { PFSheet.handleDropdown("Intimidate-ability", ["Intimidate-ability-mod"]); });
on("change:intimidate-cs change:intimidate-ranks change:intimidate-class change:checks-cond change:intimidate-ability-mod change:intimidate-racial change:intimidate-feat change:intimidate-item change:intimidate-size change:intimidate-acp change:intimidate-misc change:intimidate-ReqTrain"
   , function () { PFSheet.updateSkill("Intimidate"); });

on("change:linguistics-ability", function () { PFSheet.handleDropdown("Linguistics-ability", ["Linguistics-ability-mod"]); });
on("change:linguistics-cs change:linguistics-ranks change:linguistics-class change:checks-cond change:linguistics-ability-mod change:linguistics-racial change:linguistics-feat change:linguistics-item change:linguistics-size change:linguistics-acp change:linguistics-misc change:linguistics-ReqTrain"
   , function () { PFSheet.updateSkill("Linguistics"); });

on("change:lore-ability", function () { PFSheet.handleDropdown("Lore-ability", ["Lore-ability-mod"]); });
on("change:lore-cs change:lore-ranks change:lore-class change:checks-cond change:lore-ability-mod change:lore-racial change:lore-feat change:lore-item change:lore-size change:lore-acp change:lore-misc change:lore-ReqTrain"
   , function () { PFSheet.updateSkill("Lore"); });

on("change:knowledge-arcana-ability", function () { PFSheet.handleDropdown("Knowledge-Arcana-ability", ["Knowledge-Arcana-ability-mod"]); });
on("change:knowledge-arcana-cs change:knowledge-arcana-ranks change:knowledge-arcana-class change:checks-cond change:knowledge-arcana-ability-mod change:knowledge-arcana-racial change:knowledge-arcana-feat change:knowledge-arcana-item change:knowledge-arcana-size change:knowledge-arcana-acp change:knowledge-arcana-misc change:knowledge-arcana-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Arcana"); });

on("change:knowledge-dungeoneering-ability", function () { PFSheet.handleDropdown("Knowledge-Dungeoneering-ability", ["Knowledge-Dungeoneering-ability-mod"]); });
on("change:knowledge-dungeoneering-cs change:knowledge-dungeoneering-ranks change:knowledge-dungeoneering-class change:checks-cond change:knowledge-dungeoneering-ability-mod change:knowledge-dungeoneering-racial change:knowledge-dungeoneering-feat change:knowledge-dungeoneering-item change:knowledge-dungeoneering-size change:knowledge-dungeoneering-acp change:knowledge-dungeoneering-misc change:knowledge-dungeoneering-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Dungeoneering"); });

on("change:knowledge-engineering-ability", function () { PFSheet.handleDropdown("Knowledge-Engineering-ability", ["Knowledge-Engineering-ability-mod"]); });
on("change:knowledge-engineering-cs change:knowledge-engineering-ranks change:knowledge-engineering-class change:checks-cond change:knowledge-engineering-ability-mod change:knowledge-engineering-racial change:knowledge-engineering-feat change:knowledge-engineering-item change:knowledge-engineering-size change:knowledge-engineering-acp change:knowledge-engineering-misc change:knowledge-engineering-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Engineering"); });

on("change:knowledge-geography-ability", function () { PFSheet.handleDropdown("Knowledge-Geography-ability", ["Knowledge-Geography-ability-mod"]); });
on("change:knowledge-geography-cs change:knowledge-geography-ranks change:knowledge-geography-class change:checks-cond change:knowledge-geography-ability-mod change:knowledge-geography-racial change:knowledge-geography-feat change:knowledge-geography-item change:knowledge-geography-size change:knowledge-geography-acp change:knowledge-geography-misc change:knowledge-geography-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Geography"); });

on("change:knowledge-history-ability", function () { PFSheet.handleDropdown("Knowledge-History-ability", ["Knowledge-History-ability-mod"]); });
on("change:knowledge-history-cs change:knowledge-history-ranks change:knowledge-history-class change:checks-cond change:knowledge-history-ability-mod change:knowledge-history-racial change:knowledge-history-feat change:knowledge-history-item change:knowledge-history-size change:knowledge-history-acp change:knowledge-history-misc change:knowledge-history-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-History"); });

on("change:knowledge-local-ability", function () { PFSheet.handleDropdown("Knowledge-Local-ability", ["Knowledge-Local-ability-mod"]); });
on("change:knowledge-local-cs change:knowledge-local-ranks change:knowledge-local-class change:checks-cond change:knowledge-local-ability-mod change:knowledge-local-racial change:knowledge-local-feat change:knowledge-local-item change:knowledge-local-size change:knowledge-local-acp change:knowledge-local-misc change:knowledge-local-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Local"); });

on("change:knowledge-nature-ability", function () { PFSheet.handleDropdown("Knowledge-Nature-ability", ["Knowledge-Nature-ability-mod"]); });
on("change:knowledge-nature-cs change:knowledge-nature-ranks change:knowledge-nature-class change:checks-cond change:knowledge-nature-ability-mod change:knowledge-nature-racial change:knowledge-nature-feat change:knowledge-nature-item change:knowledge-nature-size change:knowledge-nature-acp change:knowledge-nature-misc change:knowledge-nature-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Nature"); });

on("change:knowledge-nobility-ability", function () { PFSheet.handleDropdown("Knowledge-Nobility-ability", ["Knowledge-Nobility-ability-mod"]); });
on("change:knowledge-nobility-cs change:knowledge-nobility-ranks change:knowledge-nobility-class change:checks-cond change:knowledge-nobility-ability-mod change:knowledge-nobility-racial change:knowledge-nobility-feat change:knowledge-nobility-item change:knowledge-nobility-size change:knowledge-nobility-acp change:knowledge-nobility-misc change:knowledge-nobility-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Nobility"); });

on("change:knowledge-planes-ability", function () { PFSheet.handleDropdown("Knowledge-Planes-ability", ["Knowledge-Planes-ability-mod"]); });
on("change:knowledge-planes-cs change:knowledge-planes-ranks change:knowledge-planes-class change:checks-cond change:knowledge-planes-ability-mod change:knowledge-planes-racial change:knowledge-planes-feat change:knowledge-planes-item change:knowledge-planes-size change:knowledge-planes-acp change:knowledge-planes-misc change:knowledge-planes-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Planes"); });

on("change:knowledge-religion-ability", function () { PFSheet.handleDropdown("Knowledge-Religion-ability", ["Knowledge-Religion-ability-mod"]); });
on("change:knowledge-religion-cs change:knowledge-religion-ranks change:knowledge-religion-class change:checks-cond change:knowledge-religion-ability-mod change:knowledge-religion-racial change:knowledge-religion-feat change:knowledge-religion-item change:knowledge-religion-size change:knowledge-religion-acp change:knowledge-religion-misc change:knowledge-religion-ReqTrain"
   , function () { PFSheet.updateSkill("Knowledge-Religion"); });

on("change:perception-ability", function () { PFSheet.handleDropdown("Perception-ability", ["Perception-ability-mod"]); });
on("change:perception-cs change:perception-ranks change:perception-class change:checks-cond change:perception-ability-mod change:perception-racial change:perception-feat change:perception-item change:perception-size change:perception-acp change:perception-misc change:perception-ReqTrain"
   , function () { PFSheet.updateSkill("Perception"); });

on("change:perform-ability", function () { PFSheet.handleDropdown("Perform-ability", ["Perform-ability-mod"]); });
on("change:perform-cs change:perform-ranks change:perform-class change:checks-cond change:perform-ability-mod change:perform-racial change:perform-feat change:perform-item change:perform-size change:perform-acp change:perform-misc change:perform-ReqTrain"
   , function () { PFSheet.updateSkill("Perform"); });

on("change:perform2-ability", function () { PFSheet.handleDropdown("Perform2-ability", ["Perform2-ability-mod"]); });
on("change:perform2-cs change:perform2-ranks change:perform2-class change:checks-cond change:perform2-ability-mod change:perform2-racial change:perform2-feat change:perform2-item change:perform2-size change:perform2-acp change:perform2-misc change:perform2-ReqTrain"
   , function () { PFSheet.updateSkill("Perform2"); });

on("change:perform3-ability", function () { PFSheet.handleDropdown("Perform3-ability", ["Perform3-ability-mod"]); });
on("change:perform3-cs change:perform3-ranks change:perform3-class change:checks-cond change:perform3-ability-mod change:perform3-racial change:perform3-feat change:perform3-item change:perform3-size change:perform3-acp change:perform3-misc change:perform3-ReqTrain"
   , function () { PFSheet.updateSkill("Perform3"); });

on("change:profession-ability", function () { PFSheet.handleDropdown("Profession-ability", ["Profession-ability-mod"]); });
on("change:profession-cs change:profession-ranks change:profession-class change:checks-cond change:profession-ability-mod change:profession-racial change:profession-feat change:profession-item change:profession-size change:profession-acp change:profession-misc change:profession-ReqTrain"
   , function () { PFSheet.updateSkill("Profession"); });

on("change:profession2-ability", function () { PFSheet.handleDropdown("Profession2-ability", ["Profession2-ability-mod"]); });
on("change:profession2-cs change:profession2-ranks change:profession2-class change:checks-cond change:profession2-ability-mod change:profession2-racial change:profession2-feat change:profession2-item change:profession2-size change:profession2-acp change:profession2-misc change:profession2-ReqTrain"
   , function () { PFSheet.updateSkill("Profession2"); });

on("change:profession3-ability", function () { PFSheet.handleDropdown("Profession3-ability", ["Profession3-ability-mod"]); });
on("change:profession3-cs change:profession3-ranks change:profession3-class change:checks-cond change:profession3-ability-mod change:profession3-racial change:profession3-feat change:profession3-item change:profession3-size change:profession3-acp change:profession3-misc change:profession3-ReqTrain"
   , function () { PFSheet.updateSkill("Profession3"); });

on("change:ride-ability", function () { PFSheet.handleDropdown("Ride-ability", ["Ride-ability-mod"]); });
on("change:acp change:ride-cs change:ride-ranks change:ride-class change:checks-cond change:ride-ability-mod change:ride-racial change:ride-feat change:ride-item change:ride-size change:ride-acp change:ride-misc change:ride-ReqTrain"
   , function () { PFSheet.updateSkill("Ride"); });

on("change:sense-Motive-ability", function () { PFSheet.handleDropdown("Sense-Motive-ability", ["Sense-Motive-ability-mod"]); });
on("change:sense-Motive-cs change:sense-Motive-ranks change:sense-Motive-class change:checks-cond change:sense-Motive-ability-mod change:sense-Motive-racial change:sense-Motive-feat change:sense-Motive-item change:sense-Motive-size change:sense-Motive-acp change:sense-Motive-misc change:sense-Motive-ReqTrain"
   , function () { PFSheet.updateSkill("Sense-Motive"); });

on("change:sleight-of-Hand-ability", function () { PFSheet.handleDropdown("Sleight-of-Hand-ability", ["Sleight-of-Hand-ability-mod"]); });
on("change:sleight-of-Hand-cs change:sleight-of-Hand-ranks change:sleight-of-Hand-class change:checks-cond change:sleight-of-Hand-ability-mod change:sleight-of-Hand-racial change:sleight-of-Hand-feat change:sleight-of-Hand-item change:sleight-of-Hand-size change:sleight-of-Hand-acp change:sleight-of-Hand-misc change:sleight-of-Hand-ReqTrain"
   , function () { PFSheet.updateSkill("Sleight-of-Hand"); });

on("change:spellcraft-ability", function () { PFSheet.handleDropdown("Spellcraft-ability", ["Spellcraft-ability-mod"]); });
on("change:spellcraft-cs change:spellcraft-ranks change:spellcraft-class change:checks-cond change:spellcraft-ability-mod change:spellcraft-racial change:spellcraft-feat change:spellcraft-item change:spellcraft-size change:spellcraft-acp change:spellcraft-misc change:spellcraft-ReqTrain"
   , function () { PFSheet.updateSkill("Spellcraft"); });

on("change:stealth-ability", function () { PFSheet.handleDropdown("Stealth-ability", ["Stealth-ability-mod"]); });
on("change:acp change:size_skill_double change:stealth-cs change:stealth-ranks change:stealth-class change:checks-cond change:stealth-ability-mod change:stealth-racial change:stealth-feat change:stealth-item change:stealth-size change:stealth-acp change:stealth-misc change:stealth-ReqTrain"
   , function () { PFSheet.updateSkill("Stealth"); });

on("change:survival-ability", function () { PFSheet.handleDropdown("Survival-ability", ["Survival-ability-mod"]); });
on("change:survival-cs change:survival-ranks change:survival-class change:checks-cond change:survival-ability-mod change:survival-racial change:survival-feat change:survival-item change:survival-size change:survival-acp change:survival-misc change:survival-ReqTrain"
   , function () { PFSheet.updateSkill("Survival"); });

on("change:swim-ability", function () { PFSheet.handleDropdown("Swim-ability", ["Swim-ability-mod"]); });
on("change:acp change:swim-cs change:swim-ranks change:swim-class change:checks-cond change:swim-ability-mod change:swim-racial change:swim-feat change:swim-item change:swim-size change:swim-acp change:swim-misc change:swim-ReqTrain"
   , function () { PFSheet.updateSkill("Swim"); });

on("change:use-magic-device-ability", function () { PFSheet.handleDropdown("Use-Magic-Device-ability", ["Use-Magic-Device-ability-mod"]); });
on("change:use-magic-device-cs change:use-magic-device-ranks change:use-magic-device-class change:checks-cond change:use-magic-device-ability-mod change:use-magic-device-racial change:use-magic-device-feat change:use-magic-device-item change:use-magic-device-size change:use-magic-device-acp change:use-magic-device-misc change:use-magic-device-ReqTrain"
   , function () { PFSheet.updateSkill("Use-Magic-Device"); });

on("change:misc-skill-0-ability", function () { PFSheet.handleDropdown("Misc-Skill-0-ability", ["Misc-Skill-0-ability-mod"]); });
on("change:misc-skill-0-cs change:misc-skill-0-ranks change:misc-skill-0-class change:checks-cond change:misc-skill-0-ability-mod change:misc-skill-0-racial change:misc-skill-0-feat change:misc-skill-0-item change:misc-skill-0-size change:misc-skill-0-acp change:misc-skill-0-misc change:misc-skill-0-ReqTrain"
   , function () { PFSheet.updateSkill("Misc-Skill-0"); });

on("change:misc-skill-1-ability", function () { PFSheet.handleDropdown("Misc-Skill-1-ability", ["Misc-Skill-1-ability-mod"]); });
on("change:misc-skill-1-cs change:misc-skill-1-ranks change:misc-skill-1-class change:checks-cond change:misc-skill-1-ability-mod change:misc-skill-1-racial change:misc-skill-1-feat change:misc-skill-1-item change:misc-skill-1-size change:misc-skill-1-acp change:misc-skill-1-misc change:misc-skill-1-ReqTrain"
   , function () { PFSheet.updateSkill("Misc-Skill-1"); });

on("change:misc-skill-2-ability", function () { PFSheet.handleDropdown("Misc-Skill-2-ability", ["Misc-Skill-2-ability-mod"]); });
on("change:misc-skill-2-cs change:misc-skill-2-ranks change:misc-skill-2-class change:checks-cond change:misc-skill-2-ability-mod change:misc-skill-2-racial change:misc-skill-2-feat change:misc-skill-2-item change:misc-skill-2-size change:misc-skill-2-acp change:misc-skill-2-misc change:misc-skill-2-ReqTrain"
   , function () { PFSheet.updateSkill("Misc-Skill-2"); });

on("change:misc-skill-3-ability", function () { PFSheet.handleDropdown("Misc-Skill-3-ability", ["Misc-Skill-3-ability-mod"]); });
on("change:misc-skill-3-cs change:misc-skill-3-ranks change:misc-skill-3-class change:checks-cond change:misc-skill-3-ability-mod change:misc-skill-3-racial change:misc-skill-3-feat change:misc-skill-3-item change:misc-skill-3-size change:misc-skill-3-acp change:misc-skill-3-misc change:misc-skill-3-ReqTrain"
   , function () { PFSheet.updateSkill("Misc-Skill-3"); });

on("change:misc-skill-4-ability", function () { PFSheet.handleDropdown("Misc-Skill-4-ability", ["Misc-Skill-4-ability-mod"]); });
on("change:misc-skill-4-cs change:misc-skill-4-ranks change:misc-skill-4-class change:checks-cond change:misc-skill-4-ability-mod change:misc-skill-4-racial change:misc-skill-4-feat change:misc-skill-4-item change:misc-skill-4-size change:misc-skill-4-acp change:misc-skill-4-misc change:misc-skill-4-ReqTrain"
   , function () { PFSheet.updateSkill("Misc-Skill-4"); });

on("change:misc-skill-5-ability", function () { PFSheet.handleDropdown("Misc-Skill-5-ability", ["Misc-Skill-5-ability-mod"]); });
on("change:misc-skill-5-cs change:misc-skill-5-ranks change:misc-skill-5-class change:checks-cond change:misc-skill-5-ability-mod change:misc-skill-5-racial change:misc-skill-5-feat change:misc-skill-5-item change:misc-skill-5-size change:misc-skill-5-acp change:misc-skill-5-misc change:misc-skill-5-ReqTrain"
   , function () { PFSheet.updateSkill("Misc-Skill-5"); });

on("change:cS-Acrobatics-ability", function () { PFSheet.handleDropdown("CS-Acrobatics-ability", ["CS-Acrobatics-ability-mod"]); });
on("change:acp change:cS-Acrobatics-cs change:cS-Acrobatics-ranks change:cS-Acrobatics-class change:checks-cond change:cS-Acrobatics-ability-mod change:cS-Acrobatics-racial change:cS-Acrobatics-feat change:cS-Acrobatics-item change:cS-Acrobatics-size change:cS-Acrobatics-acp change:cS-Acrobatics-misc change:cS-Acrobatics-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Acrobatics"); });

on("change:cS-Athletics-ability", function () { PFSheet.handleDropdown("CS-Athletics-ability", ["CS-Athletics-ability-mod"]); });
on("change:acp change:cS-Athletics-cs change:cS-Athletics-ranks change:cS-Athletics-class change:checks-cond change:cS-Athletics-ability-mod change:cS-Athletics-racial change:cS-Athletics-feat change:cS-Athletics-item change:cS-Athletics-size change:cS-Athletics-acp change:cS-Athletics-misc change:cS-Athletics-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Athletics"); });


on("change:cs-finesse-ability", function () { PFSheet.handleDropdown("CS-Finesse-ability", ["CS-Finesse-ability-mod"]); });
on("change:cs-finesse-cs change:cs-finesse-ranks change:cs-finesse-class change:checks-cond change:cs-finesse-ability-mod change:cs-finesse-racial change:cs-finesse-feat change:cs-finesse-item change:cs-finesse-size change:cs-finesse-acp change:cs-finesse-misc change:cs-finesse-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Finesse"); });

on("change:cs-influence-ability", function () { PFSheet.handleDropdown("CS-Influence-ability", ["CS-Influence-ability-mod"]); });
on("change:cs-influence-cs change:cs-influence-ranks change:cs-influence-class change:checks-cond change:cs-influence-ability-mod change:cs-influence-racial change:cs-influence-feat change:cs-influence-item change:cs-influence-size change:cs-influence-acp change:cs-influence-misc change:cs-influence-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Influence"); });

on("change:cs-nature-ability", function () { PFSheet.handleDropdown("CS-Nature-ability", ["CS-Nature-ability-mod"]); });
on("change:cs-nature-cs change:cs-nature-ranks change:cs-nature-class change:checks-cond change:cs-nature-ability-mod change:cs-nature-racial change:cs-nature-feat change:cs-nature-item change:cs-nature-size change:cs-nature-acp change:cs-nature-misc change:cs-nature-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Nature"); });

on("change:cs-perception-ability", function () { PFSheet.handleDropdown("CS-Perception-ability", ["CS-Perception-ability-mod"]); });
on("change:cs-perception-cs change:cs-perception-ranks change:cs-perception-class change:checks-cond change:cs-perception-ability-mod change:cs-perception-racial change:cs-perception-feat change:cs-perception-item change:cs-perception-size change:cs-perception-acp change:cs-perception-misc change:cs-perception-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Perception"); });

on("change:cs-performance-ability", function () { PFSheet.handleDropdown("CS-Performance-ability", ["CS-Performance-ability-mod"]); });
on("change:cs-performance-cs change:cs-performance-ranks change:cs-performance-class change:checks-cond change:cs-performance-ability-mod change:cs-performance-racial change:cs-performance-feat change:cs-performance-item change:cs-performance-size change:cs-performance-acp change:cs-performance-misc change:cs-performance-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Performance"); });

on("change:cs-religion-ability", function () { PFSheet.handleDropdown("CS-Religion-ability", ["CS-Religion-ability-mod"]); });
on("change:cs-religion-cs change:cs-religion-ranks change:cs-religion-class change:checks-cond change:cs-religion-ability-mod change:cs-religion-racial change:cs-religion-feat change:cs-religion-item change:cs-religion-size change:cs-religion-acp change:cs-religion-misc change:cs-religion-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Religion"); });

on("change:cs-society-ability", function () { PFSheet.handleDropdown("CS-Society-ability", ["CS-Society-ability-mod"]); });
on("change:cs-society-cs change:cs-society-ranks change:cs-society-class change:checks-cond change:cs-society-ability-mod change:cs-society-racial change:cs-society-feat change:cs-society-item change:cs-society-size change:cs-society-acp change:cs-society-misc change:cs-society-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Society"); });

on("change:cs-spellcraft-ability", function () { PFSheet.handleDropdown("CS-Spellcraft-ability", ["CS-Spellcraft-ability-mod"]); });
on("change:cs-spellcraft-cs change:cs-spellcraft-ranks change:cs-spellcraft-class change:checks-cond change:cs-spellcraft-ability-mod change:cs-spellcraft-racial change:cs-spellcraft-feat change:cs-spellcraft-item change:cs-spellcraft-size change:cs-spellcraft-acp change:cs-spellcraft-misc change:cs-spellcraft-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Spellcraft"); });


on("change:cs-stealth-ability", function () { PFSheet.handleDropdown("CS-Stealth-ability", ["CS-Stealth-ability-mod"]); });
on("change:checks-cond change:acp change:cs-stealth-cs change:cs-stealth-ranks change:cs-stealth-class change:cs-stealth-ability-mod change:cs-stealth-racial change:cs-stealth-feat change:cs-stealth-item change:cs-stealth-size change:cs-stealth-acp change:cs-stealth-misc change:cs-stealth-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Stealth"); });

on("change:cs-survival-ability", function () { PFSheet.handleDropdown("CS-Survival-ability", ["CS-Survival-ability-mod"]); });
on("change:cs-survival-cs change:cs-survival-ranks change:cs-survival-class change:cs-survival-ability-mod change:cs-survival-racial change:cs-survival-feat change:cs-survival-item change:cs-survival-size change:cs-survival-acp change:cs-survival-misc change:cs-survival-ReqTrain"
   , function () { PFSheet.updateSkill("CS-Survival"); });

//buffs
on("change:buff_check-total", function () {
    PFSheet.updateConditionCheckPenalty();
});

//Abilities 
//on("change:str-base change:str-enhance change:str-misc change:str-temp change:str-damage change:str-penalty change:str-drain change:buff_str-total change:str-cond", function() { PFSheet.updateAbility("STR"); });
//on("change:dex-base change:dex-enhance change:dex-misc change:dex-temp change:dex-damage change:dex-penalty change:dex-drain change:buff_dex-total change:dex-cond", function() { PFSheet.updateAbility("DEX"); });
//on("change:con-base change:con-enhance change:con-misc change:con-temp change:con-damage change:con-penalty change:con-drain change:buff_con-total change:con-cond", function() { PFSheet.updateAbility("CON"); });
//on("change:int-base change:int-enhance change:int-misc change:int-temp change:int-damage change:int-penalty change:int-drain change:buff_int-total change:int-cond", function() { PFSheet.updateAbility("INT"); });
//on("change:wis-base change:wis-enhance change:wis-misc change:wis-temp change:wis-damage change:wis-penalty change:wis-drain change:buff_wis-total change:wis-cond", function() { PFSheet.updateAbility("WIS"); });
//on("change:cha-base change:cha-enhance change:cha-misc change:cha-temp change:cha-damage change:cha-penalty change:cha-drain change:buff_cha-total change:cha-cond", function() { PFSheet.updateAbility("CHA"); });

on("change:str-base change:str-enhance change:str-misc change:str-temp change:str-damage change:str-penalty change:str-drain", function () { PFSheet.updateAbility("STR"); });
on("change:dex-base change:dex-enhance change:dex-misc change:dex-temp change:dex-damage change:dex-penalty change:dex-drain", function () { PFSheet.updateAbility("DEX"); });
on("change:con-base change:con-enhance change:con-misc change:con-temp change:con-damage change:con-penalty change:con-drain change:con-cond", function () { PFSheet.updateAbility("CON"); });
on("change:int-base change:int-enhance change:int-misc change:int-temp change:int-damage change:int-penalty change:int-drain change:int-cond", function () { PFSheet.updateAbility("INT"); });
on("change:wis-base change:wis-enhance change:wis-misc change:wis-temp change:wis-damage change:wis-penalty change:wis-drain change:wis-cond", function () { PFSheet.updateAbility("WIS"); });
on("change:cha-base change:cha-enhance change:cha-misc change:cha-temp change:cha-damage change:cha-penalty change:cha-drain change:cha-cond", function () { PFSheet.updateAbility("CHA"); });



//Conditions
on("change:condition-fatigued change:condition-entangled", function () { PFSheet.updateConditionAbilityPenalty(); });
on("change:condition-grappled", function () { PFSheet.updateGrapple(); });
on("change:condition-pinned", function () { PFSheet.updatePin(); });

on("change:condition-drained", function () {
    PFSheet.updateHP();
});
on("change:condition-wounds change:condition-fear change:condition-sickened change:condition-drained", function (eventInfo) {
    PFSheet.updateConditionCheckPenalty();
    PFSheet.updateConditionsSavePenalty();
    PFSheet.updateConditionAttackPenalty();
});

on("change:condition-blinded", function (eventInfo) {
    PFSheet.updateConditionCheckPenalty();
    PFSheet.updateConditionDefensePenalty(eventInfo);
});

on("change:condition-drained change:condition-wounds change:condition-cowering change:condition-flat-footed change:condition-stunned change:condition-pinned", function (eventInfo) {
    PFSheet.updateConditionDefensePenalty(eventInfo);
});

on("change:acp-attack-mod change:condition-dazzled change:condition-entangled change:condition-grappled", function () {
    PFSheet.updateConditionAttackPenalty();
});
on("change:condition-invisible change:condition-prone", function () {
    PFSheet.updateConditionAttackPenalty();
});

on("change:condition-grappled change:condition-invisible", function () {
    PFSheet.updateConditionAttackNote();
});

//init 
on("change:init-ability", function () { PFSheet.handleDropdown("init-ability", ["init-ability-mod"]); });
on("change:init-ability-mod change:init-trait change:init-misc change:condition-deafened", function () { PFSheet.updateInit(); });

//hp
on("change:hp-ability", function () { PFSheet.handleDropdown("HP-ability", ["HP-ability-mod"]); });
on("change:hp-ability-mod change:level change:total-hp change:total-mythic-hp change:hp-formula-mod change:HP-misc", function () { PFSheet.updateHP(); });
on("change:hp-temp-misc change:buff_hp-temp-total", function () { PFSheet.updateTempHP(); });
on("change:hp-formula-macro-text", function () { SWUtils.evaluateAndSetNumber("HP-formula-macro-text", "HP-formula-mod"); });




//classes
on("change:class-0-hp change:class-1-hp change:class-2-hp change:class-3-hp change:class-4-hp change:class-5-hp", function () { PFSheet.updateClassInformation("hp"); });
on("change:class-0-fchp change:class-1-fchp change:class-2-fchp change:class-3-fchp change:class-4-fchp change:class-5-fchp", function () { PFSheet.updateClassInformation("fchp"); });
on("change:class-0-bab change:class-1-bab change:class-2-bab change:class-3-bab change:class-4-bab change:class-5-bab", function () { PFSheet.updateClassInformation("bab"); });
on("change:class-0-skill change:class-1-skill change:class-2-skill change:class-3-skill change:class-4-skill change:class-5-skill", function () { PFSheet.updateClassInformation("skill"); });
on("change:class-0-fcskill change:class-1-fcskill change:class-2-fcskill change:class-3-fcskill change:class-4-fcskill change:class-5-fcskill", function () { PFSheet.updateClassInformation("fcskill"); });
on("change:class-0-fcalt change:class-1-fcalt change:class-2-fcalt change:class-3-fcalt change:class-4-fcalt change:class-5-fcalt", function () { PFSheet.updateClassInformation("fcalt"); });
on("change:class-0-fort change:class-1-fort change:class-2-fort change:class-3-fort change:class-4-fort change:class-5-fort", function () { PFSheet.updateClassInformation("Fort"); });
on("change:class-0-ref change:class-1-ref change:class-2-ref change:class-3-ref change:class-4-ref change:class-5-ref", function () { PFSheet.updateClassInformation("Ref"); });
on("change:class-0-will change:class-1-will change:class-2-will change:class-3-will change:class-4-will change:class-5-will", function () { PFSheet.updateClassInformation("Will"); });
on("change:class-0-level change:class-1-level change:class-2-level change:class-3-level change:class-4-level change:class-5-level", function () {
    PFSheet.updateClassInformation("level");
    PFSheet.updateClassInformation("skill");
});

//mythic paths, mythic power
on("change:mythic-0-tier change:mythic-0-hp", function () { PFSheet.updateMythicPathInformation(); });
on("change:mythic-0-tier", function () { PFSheet.updateTierMythicPower(); });
on("change:misc-mythic-power change:tier-mythic-power", function () { PFSheet.updateMythicPower(); });

//class abilities
on("change:repeating_class-ability:max-calculation", function () { SWUtils.evaluateAndSetNumber("repeating_class-ability_max-calculation", "repeating_class-ability_used_max"); });
//on("change:repeating_class-ability:max-calculation",function(eventInfo){ console.log("Detected change to "+eventInfo.sourceAttribute);});

//defense dropdowns
//on("change:ac-ability", function () {PFSheet.handleDefenseDropdown("AC-ability");});
//on("change:ff-ability", function () {PFSheet.handleDefenseDropdown("FF-ability");});
//on("change:cmd-ability1", function () {PFSheet.handleDefenseDropdown("CMD-ability1");});
//on("change:cmd-ability2", function () {PFSheet.handleDefenseDropdown("CMD-ability2");});
//on("change:cmd-ability", function () {PFSheet.handleDefenseDropdown("CMD-ability");});

on("change:ac-ability change:ff-ability change:cmd-ability1 change:cmd-ability2 change:cmd-ability"
	, function (eventInfo) { PFSheet.handleDefenseDropdown(eventInfo.sourceAttribute); });


//defenses
on("change:condition-stunned change:condition-flat-footed change:ac-ability-mod change:ff-dex change:ac-penalty change:cmd-penalty change:size change:ac-dodge change:ac-natural change:ac-deflect change:ac-misc change:ac-shield change:ac-armor change:cmd-dex change:ff-cmd-dex change:cmd-str change:cmd-misc change:buff_ac-total change:buff_touch-total change:buff_cmd-total change:bab change:max-dex"
	, function (eventInfo) { PFSheet.updateDefenses(eventInfo); });

on("change:shield-equipped change:shield-acbonus change:shield-max-dex change:shield-acp change:shield-spell-fail change:shield-proficiency "
	+ "change:shield2-equipped change:shield2-acbonus change:shield2-max-dex change:shield2-acp change:shield2-spell-fail change:shield2-proficiency "
	+ "change:armor-equipped change:armor-acbonus change:armor-max-dex change:armor-acp change:armor-spell-fail change:armor-proficiency "
	+ "change:armor2-equipped change:armor2-acbonus change:armor2-max-dex change:armor2-acp change:armor2-spell-fail change:armor2-proficiency "
	+ "change:max-dex-source change:acp-source"
	, function (eventInfo) { PFSheet.updateArmor(eventInfo.sourceAttribute); });

//saves
on("change:saves-cond change:total-fort change:fort-ability-mod change:fort-trait change:fort-enhance change:fort-resist change:fort-misc change:buff_fort-total", function () {
    PFSheet.updateSave("Fort");
});
on("change:saves-cond change:total-ref change:ref-ability-mod change:ref-trait change:ref-enhance change:ref-resist change:ref-misc change:buff_ref-total", function () {
    PFSheet.updateSave("Ref");
});
on("change:saves-cond change:total-will change:will-ability-mod change:will-trait change:will-enhance change:will-resist change:will-misc change:buff_will-total", function () {
    PFSheet.updateSave("Will");
});
on("change:fort-ability", function () { PFSheet.handleDropdown("Fort-ability", "Fort-ability-mod"); });
on("change:ref-ability", function () { PFSheet.handleDropdown("Ref-ability", "Ref-ability-mod"); });
on("change:will-ability", function () { PFSheet.handleDropdown("Will-ability", "Will-ability-mod"); });


//attacks
on("change:melee-ability", function () { PFSheet.handleDropdown("melee-ability", "melee-ability-mod"); });
on("change:ranged-ability", function () { PFSheet.handleDropdown("ranged-ability", "ranged-ability-mod"); });
on("change:cmb-ability", function () { PFSheet.handleDropdown("CMB-ability", "CMB-ability-mod"); });
on("change:bab change:size change:melee-ability-mod change:buff_melee-total change:attk-melee-misc change:attk-penalty", function () { PFSheet.updateAttack("melee"); });
on("change:bab change:size change:ranged-ability-mod change:buff_ranged-total change:attk-ranged-misc change:attk-penalty", function () { PFSheet.updateAttack("ranged"); });
on("change:bab change:CMD-size change:cmb-ability-mod change:cmb-total change:attk-cmb-misc change:attk-penalty", function () { PFSheet.updateAttack("CMB"); });
on("change:condition-Sickened change:buff_dmg-total", function () { PFSheet.updateDamage(); });


//attack effects
on("change:attk-effect_mod_1 change:attk-effect_mod_1_Toggle change:attk-effect_mod_2 change:attk-effect_mod_2_Toggle change:attk-effect_mod_3 change:attk-effect_mod_3_Toggle change:attk-effect_mod_4 change:attk-effect_mod_4_Toggle"
, function () {
    PFSheet.updateAttackEffectTotals();
});
on("change:dmg-effect_mod_1 change:dmg-effect_mod_1_Toggle change:dmg-effect_mod_2 change:dmg-effect_mod_2_Toggle change:dmg-effect_mod_3 change:dmg-effect_mod_3_Toggle change:dmg-effect_mod_4 change:dmg-effect_mod_4_Toggle"
, function () {
    PFSheet.updateDMGEffectTotals();
});
//repeating weapons
on("change:attk-effect-total", function (eventInfo) { PFSheet.updateRepeatingWeaponAttacks(eventInfo); });
on("change:dmg-effect-total change:dmg-mod", function () { PFSheet.updateRepeatingWeaponDamages(); });


on("change:repeating_weapon:attack-type-mod change:repeating_weapon:masterwork change:repeating_weapon:proficiency change:repeating_weapon:attack-mod"
	, function (eventInfo) {
	    PFSheet.updateRepeatingWeaponAttack(null, eventInfo);
	});
on("change:repeating_weapon:damage-ability-mod change:repeating_weapon:damage-mod change:repeating_weapon:damage-ability-max"
	, function () {
	    PFSheet.updateRepeatingWeaponDamage();
	});

on("change:repeating_weapon:attack-type", function (eventInfo) { PFSheet.handleRepeatingAttackDropdown(null, eventInfo); });
on("change:repeating_weapon:damage-ability", function () { PFSheet.handleRepeatingDamageDropdown(); });
on("change:repeating_weapon:damage", function () { SWUtils.evaluateAndSetNumber("repeating_weapon_damage", "repeating_weapon_damage-mod"); });
on("change:repeating_weapon:attack", function () { SWUtils.evaluateAndSetNumber("repeating_weapon_attack", "repeating_weapon_attack-mod"); });

on("change:repeating_weapon:enhance", function (eventInfo) {
    PFSheet.updateRepeatingWeaponAttack(null, eventInfo);
    PFSheet.updateRepeatingWeaponDamage();
});

//size
on("change:size", function () {
    PFSheet.updateSize();
    PFSheet.updateDamageNote();
});
//feats
on("change:repeating_feat:max-calculation", function () { SWUtils.evaluateAndSetNumber("repeating_feat_max-calculation", "repeating_feat_used_max"); });
//racial-traits
on("change:repeating_racial-trait:max-calculation", function () { SWUtils.evaluateAndSetNumber("repeating_racial-trait_max-calculation", "repeating_racial-trait_used_max"); });
//traits
on("change:repeating_trait:max-calculation", function () { SWUtils.evaluateAndSetNumber("repeating_trait_max-calculation", "repeating_trait_used_max"); });



//skills
on("change:total-skill change:total-fcskill change:int-mod change:level change:max-skill-ranks-mod change:Max-Skill-Ranks-Misc2 change:unchained_skills-show change:BG-Skill-Use", function () { PFSheet.updateMaxSkills(); });
on("change:max-skill-ranks-misc", function () { SWUtils.evaluateAndSetNumber("Max-Skill-Ranks-Misc", "Max-Skill-Ranks-mod"); });



on("change:size_skill", function () { PFSheet.updateSkill("Fly"); });

on("change:size_skill_double", function () { PFSheet.updateSkill("Stealth"); });

on("change:Phys-skills-cond", function () {
    PFSheet.updateSkill("Acrobatics");
    PFSheet.updateSkill("Climb");
    PFSheet.updateSkill("Disable-Device");
    PFSheet.updateSkill("Escape-Artist");
    PFSheet.updateSkill("Fly");
    PFSheet.updateSkill("Intimidate");
    PFSheet.updateSkill("Ride");
    PFSheet.updateSkill("Sleight-of-Hand");
    PFSheet.updateSkill("Stealth");
    PFSheet.updateSkill("Swim");
    PFSheet.updateSkill("CS-Acrobatics");
    PFSheet.updateSkill("CS-Athletics");
    PFSheet.updateSkill("CS-Finesse");
    PFSheet.updateSkill("CS-Stealth");
});
on("change:Perception-cond", function () {
    PFSheet.updateSkill("Perception");
    PFSheet.updateSkill("CS-Perception");
});

//sheet
on("sheet:opened", function () { PFSheet.checkForUpdate(); });
on("change:recalc1", function () { PFSheet.checkForUpdate(); });

//npc sheet
on("change:npc-hd change:npc-hd-num change:npc-hd2 change:npc-hd-num2 change:npc-hd-misc-mod", function () { PFSheet.updateNPCHP(); });
on("change:npc-hd-misc", function () { SWUtils.evaluateAndSetNumber("NPC-HD-misc", "NPC-HD-misc-mod"); });


//spells
on("change:spellclass-0", function () { PFSheet.handleSpellClassDropdown(0); });
on("change:spellclass-1", function () { PFSheet.handleSpellClassDropdown(1); });
on("change:spellclass-2", function () { PFSheet.handleSpellClassDropdown(2); });

on("change:class-0-level", function () { PFSheet.updateSpellClassLevel(0); });
on("change:class-1-level", function () { PFSheet.updateSpellClassLevel(1); });
on("change:class-2-level", function () { PFSheet.updateSpellClassLevel(2); });
on("change:class-3-level", function () { PFSheet.updateSpellClassLevel(3); });
on("change:class-4-level", function () { PFSheet.updateSpellClassLevel(4); });
on("change:class-5-level", function () { PFSheet.updateSpellClassLevel(5); });


on("change:concentration-0-ability", function () { PFSheet.handleConcentrationAbilityDropdown(0); });
on("change:concentration-1-ability", function () { PFSheet.handleConcentrationAbilityDropdown(1); });
on("change:concentration-2-ability", function () { PFSheet.handleConcentrationAbilityDropdown(2); });


on("change:concentration-0-mod", function () { PFSheet.ifSpellClassExists(0, function () { PFSheet.updateBonusSpells(0); PFSheet.updateSaveDCs(0); }); });
on("change:concentration-1-mod", function () { PFSheet.ifSpellClassExists(1, function () { PFSheet.updateBonusSpells(1); PFSheet.updateSaveDCs(1); }); });
on("change:concentration-2-mod", function () { PFSheet.ifSpellClassExists(2, function () { PFSheet.updateBonusSpells(2); PFSheet.updateSaveDCs(2); }); });

on("change:concentration-0-mod change:buff_check-total change:concentration-0-misc", function () { PFSheet.ifSpellClassExists(0, function () { PFSheet.updateConcentration(0); }); });
on("change:concentration-1-mod change:buff_check-total change:concentration-1-misc", function () { PFSheet.ifSpellClassExists(1, function () { PFSheet.updateConcentration(1); }); });
on("change:concentration-2-mod change:buff_check-total change:concentration-2-misc", function () { PFSheet.ifSpellClassExists(2, function () { PFSheet.updateConcentration(2); }); });

on("change:spellclass-0-level-total", function () {
    PFSheet.updateConcentration(0);
    PFSheet.updateSpellPenetration(0);
});
on("change:spellclass-1-level-total", function () {
    PFSheet.updateConcentration(1);
    PFSheet.updateSpellPenetration(1);
});
on("change:spellclass-2-level-total", function () {
    PFSheet.updateConcentration(2);
    PFSheet.updateSpellPenetration(2);
});
on("change:spellclass-0-SP_misc", function () {
    PFSheet.updateSpellPenetration(0);
});
on("change:spellclass-1-SP_misc", function () {
    PFSheet.updateSpellPenetration(1);
});
on("change:spellclass-2-SP_misc", function () {
    PFSheet.updateSpellPenetration(2);
});
on("change:condition-Deafened", function () { PFSheet.updateCastingPenaltyNote(); });



on("change:spellclass-0-level-0-class change:spellclass-0-level-0-bonus change:spellclass-0-level-0-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 0); });
on("change:spellclass-0-level-1-class change:spellclass-0-level-1-bonus change:spellclass-0-level-1-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 1); });
on("change:spellclass-0-level-2-class change:spellclass-0-level-2-bonus change:spellclass-0-level-2-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 2); });
on("change:spellclass-0-level-3-class change:spellclass-0-level-3-bonus change:spellclass-0-level-3-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 3); });
on("change:spellclass-0-level-4-class change:spellclass-0-level-4-bonus change:spellclass-0-level-4-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 4); });
on("change:spellclass-0-level-5-class change:spellclass-0-level-5-bonus change:spellclass-0-level-5-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 5); });
on("change:spellclass-0-level-6-class change:spellclass-0-level-6-bonus change:spellclass-0-level-6-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 6); });
on("change:spellclass-0-level-7-class change:spellclass-0-level-7-bonus change:spellclass-0-level-7-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 7); });
on("change:spellclass-0-level-8-class change:spellclass-0-level-8-bonus change:spellclass-0-level-8-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 8); });
on("change:spellclass-0-level-9-class change:spellclass-0-level-9-bonus change:spellclass-0-level-9-misc", function () { PFSheet.updateMaxSpellsPerDay(0, 9); });

on("change:spellclass-1-level-0-class change:spellclass-1-level-0-bonus change:spellclass-1-level-0-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 0); });
on("change:spellclass-1-level-1-class change:spellclass-1-level-1-bonus change:spellclass-1-level-1-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 1); });
on("change:spellclass-1-level-2-class change:spellclass-1-level-2-bonus change:spellclass-1-level-2-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 2); });
on("change:spellclass-1-level-3-class change:spellclass-1-level-3-bonus change:spellclass-1-level-3-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 3); });
on("change:spellclass-1-level-4-class change:spellclass-1-level-4-bonus change:spellclass-1-level-4-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 4); });
on("change:spellclass-1-level-5-class change:spellclass-1-level-5-bonus change:spellclass-1-level-5-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 5); });
on("change:spellclass-1-level-6-class change:spellclass-1-level-6-bonus change:spellclass-1-level-6-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 6); });
on("change:spellclass-1-level-7-class change:spellclass-1-level-7-bonus change:spellclass-1-level-7-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 7); });
on("change:spellclass-1-level-8-class change:spellclass-1-level-8-bonus change:spellclass-1-level-8-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 8); });
on("change:spellclass-1-level-9-class change:spellclass-1-level-9-bonus change:spellclass-1-level-9-misc", function () { PFSheet.updateMaxSpellsPerDay(1, 9); });

on("change:spellclass-2-level-0-class change:spellclass-2-level-0-bonus change:spellclass-2-level-0-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 0); });
on("change:spellclass-2-level-1-class change:spellclass-2-level-1-bonus change:spellclass-2-level-1-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 1); });
on("change:spellclass-2-level-2-class change:spellclass-2-level-2-bonus change:spellclass-2-level-2-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 2); });
on("change:spellclass-2-level-3-class change:spellclass-2-level-3-bonus change:spellclass-2-level-3-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 3); });
on("change:spellclass-2-level-4-class change:spellclass-2-level-4-bonus change:spellclass-2-level-4-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 4); });
on("change:spellclass-2-level-5-class change:spellclass-2-level-5-bonus change:spellclass-2-level-5-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 5); });
on("change:spellclass-2-level-6-class change:spellclass-2-level-6-bonus change:spellclass-2-level-6-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 6); });
on("change:spellclass-2-level-7-class change:spellclass-2-level-7-bonus change:spellclass-2-level-7-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 7); });
on("change:spellclass-2-level-8-class change:spellclass-2-level-8-bonus change:spellclass-2-level-8-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 8); });
on("change:spellclass-2-level-9-class change:spellclass-2-level-9-bonus change:spellclass-2-level-9-misc", function () { PFSheet.updateMaxSpellsPerDay(2, 9); });


on("change:spellclass-0-level change:spellclass-0-level-misc change:buff_CasterLevel-total change:condition-Drained", function () { PFSheet.updateCasterLevel(0); });
on("change:spellclass-1-level change:spellclass-1-level-misc change:buff_CasterLevel-total change:condition-Drained", function () { PFSheet.updateCasterLevel(1); });
on("change:spellclass-2-level change:spellclass-2-level-misc change:buff_CasterLevel-total change:condition-Drained", function () { PFSheet.updateCasterLevel(2); });



on("change:concentration-0 change:spellclass-0-level-total change:spellclass-0-SP-mod change:concentration-0-def " +
	"change:concentration-1 change:spellclass-1-level-total change:spellclass-1-SP-mod change:concentration-1-def " +
	"change:concentration-2 change:spellclass-2-level-total change:spellclass-2-SP-mod change:concentration-2-def"
	, function () {
	    PFSheet.updateSpells("lvl-0-spells");
	    PFSheet.updateSpells("lvl-1-spells");
	    PFSheet.updateSpells("lvl-2-spells");
	    PFSheet.updateSpells("lvl-3-spells");
	    PFSheet.updateSpells("lvl-4-spells");
	    PFSheet.updateSpells("lvl-5-spells");
	    PFSheet.updateSpells("lvl-6-spells");
	    PFSheet.updateSpells("lvl-7-spells");
	    PFSheet.updateSpells("lvl-8-spells");
	    PFSheet.updateSpells("lvl-9-spells");
	});

on("change:spellclass-0-level-0-savedc change:spellclass-1-level-0-savedc change:spellclass-2-level-0-savedc", function () { PFSheet.updateSpells("lvl-0-spells"); });
on("change:spellclass-0-level-1-savedc change:spellclass-1-level-1-savedc change:spellclass-2-level-1-savedc", function () { PFSheet.updateSpells("lvl-1-spells"); });
on("change:spellclass-0-level-2-savedc change:spellclass-1-level-2-savedc change:spellclass-2-level-2-savedc", function () { PFSheet.updateSpells("lvl-2-spells"); });
on("change:spellclass-0-level-3-savedc change:spellclass-1-level-3-savedc change:spellclass-2-level-3-savedc", function () { PFSheet.updateSpells("lvl-3-spells"); });
on("change:spellclass-0-level-4-savedc change:spellclass-1-level-4-savedc change:spellclass-2-level-4-savedc", function () { PFSheet.updateSpells("lvl-4-spells"); });
on("change:spellclass-0-level-5-savedc change:spellclass-1-level-5-savedc change:spellclass-2-level-5-savedc", function () { PFSheet.updateSpells("lvl-5-spells"); });
on("change:spellclass-0-level-6-savedc change:spellclass-1-level-6-savedc change:spellclass-2-level-6-savedc", function () { PFSheet.updateSpells("lvl-6-spells"); });
on("change:spellclass-0-level-7-savedc change:spellclass-1-level-7-savedc change:spellclass-2-level-7-savedc", function () { PFSheet.updateSpells("lvl-7-spells"); });
on("change:spellclass-0-level-8-savedc change:spellclass-1-level-8-savedc change:spellclass-2-level-8-savedc", function () { PFSheet.updateSpells("lvl-8-spells"); });
on("change:spellclass-0-level-9-savedc change:spellclass-1-level-9-savedc change:spellclass-2-level-9-savedc", function () { PFSheet.updateSpells("lvl-9-spells"); });


on("change:repeating_lvl-0-spells:spellclass change:repeating_lvl-0-spells:spell_level change:repeating_lvl-0-spells:DC_misc change:repeating_lvl-0-spells:CL_misc change:repeating_lvl-0-spells:SP_misc  change:repeating_lvl-0-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-0-spells", null, eventInfo); });
on("change:repeating_lvl-1-spells:spellclass change:repeating_lvl-1-spells:spell_level change:repeating_lvl-1-spells:DC_misc change:repeating_lvl-1-spells:CL_misc change:repeating_lvl-1-spells:SP_misc  change:repeating_lvl-1-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-1-spells", null, eventInfo); });
on("change:repeating_lvl-2-spells:spellclass change:repeating_lvl-2-spells:spell_level change:repeating_lvl-2-spells:DC_misc change:repeating_lvl-2-spells:CL_misc change:repeating_lvl-2-spells:SP_misc  change:repeating_lvl-2-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-2-spells", null, eventInfo); });
on("change:repeating_lvl-3-spells:spellclass change:repeating_lvl-3-spells:spell_level change:repeating_lvl-3-spells:DC_misc change:repeating_lvl-3-spells:CL_misc change:repeating_lvl-3-spells:SP_misc  change:repeating_lvl-3-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-3-spells", null, eventInfo); });
on("change:repeating_lvl-4-spells:spellclass change:repeating_lvl-4-spells:spell_level change:repeating_lvl-4-spells:DC_misc change:repeating_lvl-4-spells:CL_misc change:repeating_lvl-4-spells:SP_misc  change:repeating_lvl-4-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-4-spells", null, eventInfo); });
on("change:repeating_lvl-5-spells:spellclass change:repeating_lvl-5-spells:spell_level change:repeating_lvl-5-spells:DC_misc change:repeating_lvl-5-spells:CL_misc change:repeating_lvl-5-spells:SP_misc  change:repeating_lvl-5-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-5-spells", null, eventInfo); });
on("change:repeating_lvl-6-spells:spellclass change:repeating_lvl-6-spells:spell_level change:repeating_lvl-6-spells:DC_misc change:repeating_lvl-6-spells:CL_misc change:repeating_lvl-6-spells:SP_misc  change:repeating_lvl-6-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-6-spells", null, eventInfo); });
on("change:repeating_lvl-7-spells:spellclass change:repeating_lvl-7-spells:spell_level change:repeating_lvl-7-spells:DC_misc change:repeating_lvl-7-spells:CL_misc change:repeating_lvl-7-spells:SP_misc  change:repeating_lvl-7-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-7-spells", null, eventInfo); });
on("change:repeating_lvl-8-spells:spellclass change:repeating_lvl-8-spells:spell_level change:repeating_lvl-8-spells:DC_misc change:repeating_lvl-8-spells:CL_misc change:repeating_lvl-8-spells:SP_misc  change:repeating_lvl-8-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-8-spells", null, eventInfo); });
on("change:repeating_lvl-9-spells:spellclass change:repeating_lvl-9-spells:spell_level change:repeating_lvl-9-spells:DC_misc change:repeating_lvl-9-spells:CL_misc change:repeating_lvl-9-spells:SP_misc  change:repeating_lvl-9-spells:Concentration_misc", function (eventInfo) { PFSheet.updateSpell("lvl-9-spells", null, eventInfo); });

//set repeating IDS
on("change:repeating_weapon:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("weapon", eventInfo); });
on("change:repeating_class-ability:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("class-ability", eventInfo); });
on("change:repeating_feat:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("feat", eventInfo); });
on("change:repeating_racial-trait:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("racial-trait", eventInfo); });
on("change:repeating_trait:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("trait", eventInfo); });
on("change:repeating_item:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("item", eventInfo); });
on("change:repeating_lvl-0-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-0-spells", eventInfo); });
on("change:repeating_lvl-1-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-1-spells", eventInfo); });
on("change:repeating_lvl-2-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-2-spells", eventInfo); });
on("change:repeating_lvl-3-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-3-spells", eventInfo); });
on("change:repeating_lvl-4-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-4-spells", eventInfo); });
on("change:repeating_lvl-5-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-5-spells", eventInfo); });
on("change:repeating_lvl-6-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-6-spells", eventInfo); });
on("change:repeating_lvl-7-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-7-spells", eventInfo); });
on("change:repeating_lvl-8-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-8-spells", eventInfo); });
on("change:repeating_lvl-9-spells:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("lvl-9-spells", eventInfo); });
on("change:repeating_npc-spell-like-abilities:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("npc-spell-like-abilities", eventInfo); });
on("change:repeating_npc-spells1:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("npc-spells1", eventInfo); });
on("change:repeating_npc-spells2:ids-show", function (eventInfo) { PFSheet.checkIsNewRow("npc-spells2", eventInfo); });
