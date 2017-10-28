(function(global){
    var scope = this,
        environment = typeof window=='undefined' ? 'server' : 'browser',
        exports     = typeof module!='undefined' ? module.exports : {},

        AUTO_INDEX   = false,
        AUTO_COMMIT  = true,
        INDEX_LABEL  = "_",
        INDEX_OFFSET = 0,

        istype,
        colnums,
        extend,
        namespace,

        Series,
        Promote,
        BaseSeries,
        SeriesDataException;

    istype = function(obj){
        if(obj===null)
            return "Null";
        if(obj instanceof Series || obj instanceof BaseSeries)
            return obj.toString(obj).slice(8, -1);
        return Object.prototype.toString.call(obj).slice(8, -1);
    };

    colnums = function(data){
        var max = 0;
        for(var i=0; i<data.length; i++)
            max = (data[i].length > max) ? data[i].length : max;
        return Array.apply(null, Array(max)).map(function(e, i) {return i;});
    };

    extend = function(fn, args){
        var result = fn.call(this, ...args);
        if( result instanceof Array && !(result instanceof Series) )
            return Series(result);
        return result;
    };

    inherit = function(_new_, _base_){
        var proto = Object.getPrototypeOf(_base_);
        if(proto._index!==undefined)
            Object.setPrototypeOf(_new_, Object.create(proto));
        return _new_;
    };

    namespace = function(path){
        var i,
            spaces  = path.split("."),
            context = spaces[0]=='global' || spaces[0]=='window' ? global : scope,
            name    = spaces.pop();

        for(i=0; i<spaces.length; i++){
            if(spaces[i]!==""){
                if(typeof context[spaces[i]]==='undefined')
                   context[spaces[i]] = {};
                context = context[spaces[i]];
            }
        }
        //if(context===global)
        //    throw new ReferenceError("Invalid parameter for variable assignment.");
        return {path:context, name:name};
    };

    Promote = function(a, d){
        var self = this;

        self.direction = d;

        self.merge = function(){
            var args;

            if(arguments.length>1){
                args = arguments;

                if(Series.prototype.isPrototypeOf(args[0]) && Series.prototype.isPrototypeOf(args[1])){
                    if(args.length>2){
                        if(Object.prototype.isPrototypeOf(args[2]))
                            args[2].join = this.direction;
                    }
                }
                else{
                    if(Object.prototype.isPrototypeOf(args[1]))
                        args[1].join = this.direction;
                }
            }
            else{
                args = [].slice.call(arguments);
                args.push({join:this.direction});
            }
            return Series.prototype.merge.apply(a, args);
        };

        self.resolve = function(){
            return a.resolve(this.direction);
        };

        self.select = function(cutoff){
            var i,
                cut,
                columns,
                selected = [],
                d = self.direction;

            var select = function(d, co){
                /* cut off point is inclusive */
                columns = a.columns();
                cut = columns.indexOf(co);

                switch(d){
                    case 'left':
                        for(i=0; i<cut+1; i++)
                            selected.push(columns[i]);
                        break;
                    case 'right':
                        for(i=columns.length-1; i>=cut; i--)
                            selected.push(columns[i]);
                            selected = selected.reverse();
                        break;
                }
                return a.select(...selected);
            };

            return  select(d, cutoff);
        };

        self.delete = function(cutoff){
            var i,
                cut,
                columns,
                d = self.direction;

            var slice = function(d, co){
                /* cut off point is inclusive */
                columns = a.columns();
                cut = columns.indexOf(co);

                switch(d){
                    case 'left':
                        for(i=0; i<cut+1; i++)
                            a.delete.column(columns[i]);
                        break;
                    case 'right':
                        for(i=columns.length-1; i>=cut; i--)
                            a.delete.column(columns[i]);
                        break;
                }
                return a;
            };

            return  slice(d, cutoff);
        };
    };

    SeriesDataException = function SeriesDataException(message, name, code){
        this.message = message;
        this.code = 1;
        this.name = !name ? 'SeriesDataException' : name;
        console.error(this.name +": "+ this.message);
    };
    SeriesDataException.prototype = new Error();

    BaseSeries = function BaseSeries(){
        var args   = (arguments[0] instanceof Array) ? arguments[0] : arguments,
            series = [];

        //console.log(arguments[0])
        series.push.apply(series, args);
        Object.setPrototypeOf(series, BaseSeries.prototype);

        return series;
    };
    BaseSeries.prototype = new Array();

    Series = function Series(){
        var series, row, columns, self, proto;
        self = this;
        series = new BaseSeries(arguments[0]);

        Object.setPrototypeOf(series, Series.prototype);

        row = series[0];
        if( row instanceof Object && !(row instanceof Series) ){
            columns = series.columns();

            if(this.col !== undefined )
                columns.forEach(function(col){
                    this[col] = series.getprop(col, function(){ return this.col[col]; });
                });

            if(AUTO_INDEX===true){
                if(arguments[0] instanceof Series || arguments[0] instanceof Array){
                    series.reindex(INDEX_LABEL, INDEX_OFFSET, false);
                }
                else if((arguments[0] instanceof Series || arguments[0] instanceof Array ) &&
                       !Object.getPrototypeOf(arguments[0]).hasOwnProperty('_indexed')){

                    proto = Object.create(Object.getPrototypeOf(series));
                    proto._indexed = Series.export(series, 'json');
                    //proto._index = series._index;

                    Object.setPrototypeOf(series, proto);
                }
            }
        }
        return series;
    };

    Series.AUTO_INDEX   = AUTO_INDEX;
    Series.INDEX_LABEL  = INDEX_LABEL;
    Series.INDEX_OFFSET = INDEX_OFFSET;
    Series.AUTO_COMMIT  = AUTO_COMMIT;

    Series.prototype = new Series();
    Series.prototype.constructor = Series;
    Series.prototype.constructor.prototype = BaseSeries.prototype;
    Series.prototype.toString = function(){return '[object Series]';};

    /* Brute force extend array methods */
    Series.prototype.concat      = function(){ return extend.call(this, Array.prototype.concat,      arguments); };
    Series.prototype.copyWithin  = function(){ return extend.call(this, Array.prototype.copyWithin,  arguments); };
    Series.prototype.entries     = function(){ return extend.call(this, Array.prototype.entries,     arguments); };
    Series.prototype.every       = function(){ return extend.call(this, Array.prototype.every,       arguments); };
    Series.prototype.fill        = function(){ return extend.call(this, Array.prototype.fill,        arguments); };
    Series.prototype.filter      = function(){ return extend.call(this, Array.prototype.filter,      arguments); };
    Series.prototype.find        = function(){ return extend.call(this, Array.prototype.find,        arguments); };
    Series.prototype.findIndex   = function(){ return extend.call(this, Array.prototype.findIndex,   arguments); };
    Series.prototype.forEach     = function(){ return extend.call(this, Array.prototype.forEach,     arguments); };
    Series.prototype.includes    = function(){ return extend.call(this, Array.prototype.includes,    arguments); };
    Series.prototype.indexOf     = function(){ return extend.call(this, Array.prototype.indexOf,     arguments); };
    Series.prototype.join        = function(){ return extend.call(this, Array.prototype.join,        arguments); };
    Series.prototype.keys        = function(){ return extend.call(this, Array.prototype.keys,        arguments); };
    Series.prototype.lastIndexOf = function(){ return extend.call(this, Array.prototype.lastIndexOf, arguments); };
    Series.prototype.map         = function(){ return extend.call(this, Array.prototype.map,         arguments); };
    Series.prototype.pop         = function(){ return extend.call(this, Array.prototype.pop,         arguments); };
    Series.prototype.push        = function(){ return extend.call(this, Array.prototype.push,        arguments); };
    Series.prototype.reduce      = function(){ return extend.call(this, Array.prototype.reduce,      arguments); };
    Series.prototype.reduceRight = function(){ return extend.call(this, Array.prototype.reduceRight, arguments); };
    Series.prototype.reverse     = function(){ return extend.call(this, Array.prototype.reverse,     arguments); };
    Series.prototype.shift       = function(){ return extend.call(this, Array.prototype.shift,       arguments); };
    Series.prototype.slice       = function(){ return extend.call(this, Array.prototype.slice,       arguments); };
    Series.prototype.some        = function(){ return extend.call(this, Array.prototype.some,        arguments); };
    Series.prototype.sort        = function(){ return extend.call(this, Array.prototype.sort,        arguments); };
    Series.prototype.splice      = function(){ return extend.call(this, Array.prototype.splice,      arguments); };
    Series.prototype.unshift     = function(){ return extend.call(this, Array.prototype.unshift,     arguments); };

    SeriesFactory = function(data, index){
        var proto,
            assign,
            series;

        series = new Series(data);

        assign = function(_new_, _base_){
            proto = Object.create(Object.getPrototypeOf(_base_));
            proto._index = _base_._index;
            Object.setPrototypeOf(_new_, proto);
        };

        if(index!==undefined){
            //console.log(index);
            series.index(index);
        }
        else if(typeof data._index!=='undefined'){
            console.log(data._index);
            assign(series, data);
        }

        return series;
    };

    Series.from = function(data, done){
        var series, columns, rows, check;

        if(data instanceof Array){
            check = function(data){
                return data.length==2 && (data[1] instanceof Array || data[1] instanceof Series) && data[1].every(function(row){
                    return row instanceof Array || row instanceof Series; });
            };

            if(check(data)){
                series  = [];
                columns = data.length == 2 ? data[0] : colnums(data[1]);
                rows    = data[1];

                data[1].forEach(function(values){
                    var row = {};
                    series.push((function(){
                        columns.forEach( function(col, index){ row[col] = values[index]; } );
                        return row;
                    })());
                });
                return SeriesFactory(series);
            }
            return SeriesFactory(data);
        }
        else if(typeof data=='string'){
            if(data.split('.').pop()=='csv'){
                return Series.csv.load(data, done);
            }
            else if( data.split('.').pop()=='json' ||
                   ( data.indexOf("\n")<0 && ( /\/$/.test(data) || /^[\/\.a-zA-Z0-9]+$/.test(data) ))){
                return Series.json.load(data, done);
            }
            else if(
                data.charAt(0)!="{" && data.charAt(0)!="[" &&
                /^(\"?[a-zA-Z0-9]\"?)+(,\s*\"?[a-zA-Z0-9]\"?)+/.test(data)){
                return Series.csv.parse(data);
            }
            return Series.from(JSON.parse(data));
        }
        else if(typeof data=='object'){
            series = [];
            columns = data.hasOwnProperty('columns') ? data.columns : colnums(data.rows);

            for(var i=0; i<data.rows.length; i++){
                var row = {};
                for(var c=0; c<columns.length; c++)
                    row[columns[c]] = data.rows[i][c];
                series.push(row);
            }
            return SeriesFactory(series);
        }
    };

    Series.csv = {
        load : function(url, done){
            var ns;
            if(typeof done=='string' || done instanceof String)
                Series.load(url, function(text){
                    ns = namespace(done);
                    ns.path[ns.name] = Series.from(Series.csv.parse(text));
                }, done);
            else if(typeof done=='function')
                Series.load(url, done);
            return "parsing...";
        },
        parse : function(text){
            var lines,
                columns,
                data = [];

            lines   = text.match(/[^\r\n]+/g);
            columns = lines.shift().split(/,\s*/);

            lines.forEach(function(line){
                var row = {};
                var parts = line.split(/,\s*/).map(function(item){return item.trim();});
                parts.forEach(function(value, index){
                    if(value=="true")
                        value = true;
                    else if(value=="false")
                        value = false;
                    else if(!isNaN(value))
                        value = parseFloat(value);
                    else if(value=="null")
                        value = null;
                    else if(value=="undefined")
                        value = undefined;
                    else if(value=="NaN")
                        value = NaN;
                    else if(value.charAt(0)=='"' && value.charAt(value.length-1)=='"')
                        value = value.replace(/\"/g, "");

                    row[columns[index]] = value;
                });
                data.push(row);
            });
            return Series.from(data);
        },
        dump : function(series){
            var exported = series.columns().join(", ") + "\n";
            series.forEach(function(row){ exported += Object.values(row).map(function(item, index){
                if(typeof item=='string' || item instanceof String)
                    item = '"' + item + '"';
                else if(item===null || item===undefined)
                    item = String(item);

                if(index==Object.values(row).length-1)
                    item += "\n";
                return item;
            }).join(", "); });
            return exported;
        }
    };

    Series.json = {
        load : function(url, done){
            var ns;
            if(typeof done=='string' || done instanceof String)
                Series.load(url, function(text){
                    ns = namespace(done);
                    ns.path[ns.name] = Series.from(JSON.parse(text));
                }, done);
            else if(typeof done=='function')
                Series.load(url, done);
            return "parsing...";
        },
        dump : function(series){
            return JSON.stringify(series);
        }
    };

    Series.load = function(url, fn, name){
        var promise,
            xhttp,
            resolve = fn,
            reject = console.trace,
            status = true;

        function ajax(){
            var text1  = "Resource loaded as: ";
            var text2  = "Importing: ";
            var color1 = environment!='server' ? ['color: #DA5486', 'color: #000000'] : [];
            var color2 = environment!='server' ? ['color: #4BA8DA', 'color: #000000'] : [];

            text1 = environment!='server' ? text1 + "%c\"" + name + "\"%c" : text1 + "\"" + name + "\"";
            text2 = environment!='server' ? text2 + "%c\"" + url  + "\"%c" : text2 + "\"" + url  + "\"";

            return new Promise(function(resolve, reject){
                xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function(){
                    if(this.readyState==4){
                        if(this.status==200){
                            console.info(text1, ...color1);
                            resolve(this.responseText);
                        }
                        else reject(this.status, this.statusText);
                    }
                    else if(status) console.info(text2, ...color2);
                    status = false;
                };
                xhttp.open("GET", url, true);
                xhttp.send();
            });
        }

        if(environment=='server'){
            if(!/^http|ftp/.test(url)){
                try{
                    var fs = require('fs');
                    fs.readFile( __dirname + "/" + url, function(error, data){
                        if(error)
                            throw error;
                        console.log("Resource loaded in module.exports as: \"" + name + "\"");
                        return fn(data.toString());
                    });
                }
                catch(e){ console.trace(); }
            }
            else{
                XMLHttpRequest = require('xhr2');
                promise = ajax();
                return promise.then(resolve, reject);
            }
        }
        else{
            promise = ajax();
            return promise.then(resolve, reject);
        }
    };

    Series.export = function(series, format){
        var exported;
        format = (format===undefined) ? 'object' : format;

        switch(format){
            case 'object':
                exported = { columns : series.columns(), rows : [] };
                series.forEach(function(row){ exported.rows.push(Object.values(row)); });
                break;
            case 'array':
                exported = [ series.columns(), [] ];
                series.forEach(function(row){ exported[1].push(Object.values(row)); });
                break;
            case 'json':
                exported = Series.json.dump(series);
                break;
            case 'csv':
                exported = Series.csv.dump(series);
        }
        return exported;
    };

    Series.empty = function(num, cols){
        var row = (function(){
            var obj = {};
            if(cols!==undefined)
                cols.forEach(function(c){ obj[c] = null; });
            return obj;
        }());

        var empty = function(n){
            var a = new Array(n);
            for(var i=0;i<n;i++)
                a[i] = Object.assign({}, row);
            return a;
        };
        return Series.from(empty(num));
    };

    Series.prototype.getprop = (function(prop, getter, setter){
        Object.defineProperty(Series.prototype, prop, {
            get: getter,
            set: setter===undefined ?
                 function( ){ prop = this.getprop.call(this); } :
                 function(v){ prop = setter.call(this, v); },
            configurable: true
        });
    }).bind(Series.prototype);

    var is = function is(series){ this.series = series; };
    var to = function to(series){ this.series = series; };

    is.prototype = new is(Series.prototype);
    to.prototype = new to(Series.prototype);

    is.prototype.boolean = function(col){
        var i, char, check;

        check = function(item){ return typeof item=='boolean' || item instanceof Boolean; };

        if(col!==undefined)
            return this.series.every(function(row){ return check(row[col]); });
        return this.series.every(function(row){ return check(row); });
    };

    is.prototype.numeric = function(col){
        if(this.series.count<=0)
            return false;
        if(col!==undefined){
            return this.series.filter(function(row){
                return !isNaN(parseFloat(row[col])) && isFinite(row[col]);
            }).length > 0;
        }
        else{
            return this.series.every(function(row){return !isNaN(parseFloat(row)) && isFinite(row);});
        }
    };

    is.prototype.string = function(col){
        var i, char, check;

        if(this.series.count<=0)
            return false;

        check = function(item){ return typeof item=='string' || item instanceof String; };

        if(col!==undefined)
            return this.series.every(function(row){ return check(row[col]); });
        return this.series.every(function(row){ return check(row); });
    };

    is.prototype.alphanumeric = function(col){
        var i, char, check;

        if(this.series.count<=0)
            return false;

        check = function(item){
            if(typeof item=='number' || item instanceof Number)
                return true;
            else if(typeof item=='string' || item instanceof String){
                for(i=0; i<item.length; i++){
                    char = item.charCodeAt(i);
                    if(!(char > 47 && char < 58) && // (0-9)
                       !(char > 64 && char < 91) && // (A-Z)
                       !(char > 96 && char < 123))  // (a-z)
                       return false;
                }
                return true;
            }
            return false;
        };

        if(col!==undefined)
            return this.series.every(function(row){ return check(row[col]); });
        return this.series.every(function(row){ return check(row); });
    };

    is.prototype.empty = function(col){
        var i, char, check;

        if(this.series.count<=0)
            return true;

        check = function(item){
            return(
                item===null      ||
                item===undefined ||
                ( /^\s*$/.test(item) && (typeof item=='string' || item instanceof String )) ||
                ( isNaN(item) && (typeof item=='number'        || item instanceof Number )) ||
                ( item.length<1 && (item instanceof Array      || item instanceof Series )) ||
                ( Object.keys(item).length===0 && item.constructor===Object              ));
        };

        if(col!==undefined)
            return this.series.every(function(row){ return check(row[col]); });
        return this.series.every(function(row){ return check(row); });
    };

    to.prototype.string = function(col){
        if(col!==undefined)
            return this.series.map(function(row){ row[col] = String(row[col]); return row;});
        return this.series.map(function(item){ item = String(item); return item;});
    };

    to.prototype.number = function(col){
        if(col!==undefined)
            return this.series.map(function(row){ row[col] = Number(row[col]); return row;});
        return this.series.map(function(item){ item = Number(item); return item;});
    };

    to.prototype.boolean = function(col){
        if(col!==undefined)
            return this.series.map(function(row){ row[col] = Boolean(row[col]); return row;});
        return this.series.map(function(item){ item = Boolean(item); return item;});
    };

    Series.prototype.is = Series.prototype.getprop('is', function(){ return new is(this); });
    Series.prototype.to = Series.prototype.getprop('to', function(){ return new to(this); });

    Series.prototype.typeof = function(){
        if(arguments.length<1)
            return istype(this);
        return istype(arguments[0]);
    };

    Series.prototype.has = function(search){
        if(this.indexOf(search)!=-1)
            return true;
        return false;
    };

    Series.prototype.groupby = function(key){
      return this.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || Series.from([])).push(x);
        return rv;
      }, {});
    };

    Series.prototype.shuffle = function(){
        for(var i = this.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = this[i];
            this[i] = this[j];
            this[j] = temp;
        }
        return this;
    };

    Series.prototype.copy = function(){
        return this.slice(0);
    };

    Series.prototype.clone = function(){
        var clone = this.map(function(a){return Object.assign({}, a);});
        clone = inherit(clone, this);
        return clone;
    };

    Series.prototype.diff = function(a){
        var self = this;
        if(a.length>=this.length)
            return this.filter(function(i) {return a.indexOf(i) < 0;});
        return a.filter(function(i) {return self.indexOf(i) < 0;});
    };

    Series.prototype.intersect = function(a){
        var self = this;
        if(a.length>=this.length){
            return this.filter(function(i){return a.indexOf(i) != -1;});
        }
        return a.filter(function(i){return self.indexOf(i) != -1;});
    };

    Series.prototype.unique = function(){
        function unique(value, index, self){
            return self.indexOf(value) === index;
        }
        return this.filter(unique);
    };

    Series.prototype.duplicates = function(){
        function dupes(value, index, self){
            return self.indexOf(value) !== index;
        }
        return this.filter(dupes);
    };

    Series.prototype.column = function(col){
           var column = Series.from([]);
           for(var i=0; i<this.length; i++){
              column.push(this[i][col]);
           }
           return column;
    };

    Series.prototype.columns = function(cols){
        var proto = Object.getPrototypeOf(this);
        var _columns;
        if(cols===undefined){
            _columns = Series.from([]);

            for(var i=0, n=this.length; i<n; i++)
                _columns = _columns.concat(this[i]!==null && this[i]!==undefined ? Object.keys(this[i]) : this[i]);

            _columns = _columns.unique();
            proto._columns = _columns;
            return _columns;
        }
        else{
            var c, row;
            var table = this.clone();

            while (this.length){ this.pop(); }

            for(row=0; row<table.length; row++){
                if(this[row]===undefined) this[row] = {};

                for(c=0; c<cols.length; c++)
                    this[row][cols[c]] = table[row][cols[c]];
            }
            proto._columns = Series.from(cols);
            /* debating whether commits should be automatic */
            //if(Series.AUTO_COMMIT) this.commit();
            return this;
        }
    };

    Series.prototype.equal = function(b, a){
        a = (a===undefined) ? this : a;
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length != b.length)   return false;

        for(var i=0; i<a.length; ++i) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    };

    Series.prototype.orderby = function(col){
        return this.sort(function(a, b){if(a[col] > b[col]) return 1; else if(a[col] < b[col]) return -1; return 0;});
    };

    Series.prototype.index = function(column){
        var proto = Object.getPrototypeOf(this);
        if(typeof column!='undefined'){
            proto = Object.create(proto);
            proto._index = column;
            this.columns();
            Object.setPrototypeOf(this, proto);
        }
        else{
            return typeof proto._index != 'undefined' ? this.column(proto._index) : Series.from([]);
        }
    };

    Series.prototype.reindex = function(label, offset, commit){
        label  = typeof this._index!='undefined' ? this._index : label;
        offset = typeof offset!='undefined' ? offset : INDEX_OFFSET;
        label  = typeof label !='undefined' ? label  : INDEX_LABEL;
        commit = typeof commit!='undefined' ? commit : AUTO_COMMIT;

        for(var i=0, n=this.length; i<n; i++)
            this[i][label] = i + offset;

        this.index(label);

        var columns = this.columns();
        var index = columns.indexOf(label);

        var left  = columns.splice(0, index);
        var right = columns.splice(index+1, columns.length);

        this.columns([label].concat(left, right));

        if(commit)
            this.commit();
        return this;
    };

    Series.prototype.commit = function(){
        var proto;
        proto = Object.create(Object.getPrototypeOf(this));
        delete proto._indexed;
        Object.setPrototypeOf(this, proto);

        proto._indexed  = Series.export(this, 'json');
        proto._columns  = this.columns();

        Object.setPrototypeOf(this, proto);

        return this;
    };

    Series.prototype.revert = function(){
        var proto = Object.getPrototypeOf(this);
        if(proto.hasOwnProperty('_indexed'))
            return Series.from(proto._indexed);
        try{
            throw new SeriesDataException("No primal form of this dataset was found in the prototype chain. To create an indexed copy, call Series.prototype.commit, or call Series.prototype.reindex with the commit flag set to true.", "Indexed copy not found");
        }
        catch(e){
            return this;
        };
    };

    Series.prototype.top = function(limit){
        limit = limit===undefined ? this.length>5 ? 5 : 1 : limit;
        return this.slice(0, limit);
    };

    Series.prototype.last = function(limit){
        limit = limit===undefined ? this.length>5 ? 5 : 1 : limit;
        return this.slice(this.length-limit, this.length);
    };

    Series.prototype.limit = function(limit){
        limit = limit===undefined ? 20 : limit;
        return this.slice(0, limit);
    };

    Series.prototype.min = function(c){
        var series = c!==undefined ? this.column(c) : this;
        return Math.min.apply(null, series);
    };

    Series.prototype.max = function(c){
        var series = c!==undefined ? this.column(c) : this;
        return Math.max.apply(null, series);
    };

    Series.prototype.longest = function(c){
        var series = c!==undefined ? this.column(c) : this;
        return series.sort(function(a, b){ return String(a).length - String(b).length; })[series.length-1];
    };

    Series.prototype.shortest = function(c){
        var series = c!==undefined ? this.column(c) : this;
        return series.sort(function(a, b){ return String(a).length - String(b).length; })[0];
    };

    Series.prototype.avg = function(c){
        return this.sum(c) / this.length;
    };

    Series.prototype.sum = function(c){
        var series = c!==undefined ? this.column(c) : this;
        return series.reduce(function(a, b) { return a + b; });
    };

    Series.prototype.stdev = function(c){
        var series, avg, sqdiff;

        series = c!==undefined ? this.col[c] : this;

        avg = series.avg();
        sqdiff = series.map(function(value){ return (value - avg) * (value - avg); });

        return Math.sqrt( sqdiff.avg() );
    };

    Series.prototype.median = function(c){
        var series, lo, hi;

        series = c===undefined ? this : this.col[c];
        series.sort( function(a, b){ return a - b; } );

        lo = Math.floor( (series.length - 1) / 2 );
        hi = Math.ceil(  (series.length - 1) / 2 );

        return (series[lo] + series[hi]) / 2;
    };

    Series.prototype.apply = function(lambda){
        var self = this;
        return self.map(function(row, index, series){
            return lambda.call(self, row, index, series);
        });
    };

    Series.prototype.rename = function(o, n){
        this.map(function(row){
            row[n] = row[o];
            delete row[o];
            return row;
        });
        return this;
    };

    Series.prototype.range = function(start, end){
        return Series.from(Array.apply(null, Array(end-start+1)).map(function(e, i){return i + start;}));
    };

    Series.prototype.between = function(start, end){
       return this.slice(start, end+1);
    };

    Series.prototype.segment = function(start, end){
        return this.splice(start, (end+1)-start);
    };

    Series.prototype.select = function(...args){
        if(args.length==1 && args[0]=='*')
            return this.clone();

        var selected = this.map(function(row){
            var copy = {};
            for(var col in row)
                if(args.indexOf(col)>-1)
                    copy[col] = row[col];
            return copy;
        });
        selected.columns(args);
        inherit(selected, this);
        return selected;
    };

    Series.prototype.fill = function(condition, fill){
        /*deal with NaN behavior*/
        var parts, left, right, lambda,

        self = this,
        edge = [null, false, true, undefined, NaN];

        if(condition == '*'){
            lambda = function(row){ for(var col in row) row[col] = fill; return row; };
        }
        else if(condition.indexOf('!=')>-1){
            parts = condition.split(/\s*\!\=\s*/i);
            left  = parts[0];
            right = parts[1];

            switch(right){
                case 'null':
                    right = null;
                    break;
                case 'false':
                    right = false;
                    break;
                case 'true':
                    right = true;
                    break;
                case 'undefined':
                    right = undefined;
                    break;
                case 'NaN':
                    right = NaN;
                    break;
            }

            if(left=='*')
                lambda = function(row){ for(var col in row) if(right!=row[col]) row[col] = fill; return row; };
            else
                lambda = function(row){ if(right!=row[left]) row[left] = fill; return row; };
        }
        else if(condition.indexOf('=')>-1){
            parts = condition.split(/\s*\=\s*/i);
            left  = parts[0];
            right = parts[1];

            switch(right){
                case 'null':
                    right = null;
                    break;
                case 'false':
                    right = false;
                    break;
                case 'true':
                    right = true;
                    break;
                case 'undefined':
                    right = undefined;
                    break;
                case 'NaN':
                    right = NaN;
                    break;
            }

            if(left=='*')
                lambda = function(row){ for(var col in row) if(right==row[col]) row[col] = fill; return row; };
            else
                lambda = function(row){ if(right==row[left]) row[left] = fill; return row; };
        }
        else if(condition.search(/\s*IN\s*/i)>-1){
            parts = condition.split(/\s*IN\s*/i);
            left  = parts[0];
            right = parts[1];

            if( right.search(/\(|\)|\[|\]/i)>-1 ){
                right = parts[1].split(/\(|\)|\[|\]/i).filter(Boolean);
                right = right[0].split(",");
                right = right.map(function(token){return token.trim();});
                right = right.map(function(token){
                    switch(token){
                        case 'null':
                            token = null;
                            break;
                        case 'false':
                            token = false;
                            break;
                        case 'true':
                            token = true;
                            break;
                        case 'undefined':
                            token = undefined;
                            break;
                        case 'NaN':
                            right = NaN;
                            break;
                    }
                    return token;
                });
            }
            lambda = function(row){ if(right.indexOf(row[left])>-1) row[left] = fill; return row; };
        }
        else{
            left = condition;
            lambda = function(row){ row[left] = fill; return row; };
        }

        return this.map(lambda);
    };

    Series.prototype.null = function(fill){
        return this.fill('* = null', fill);
    };

    Series.prototype.count = Series.prototype.getprop('count', function(){return this.length;});

    Series.prototype.delete = Series.prototype.getprop('delete', function(){
        var self = this;
        return {
            column : function(c){
                self.map(function(row){delete row[c]; return row;});
                return self;
            },
            row : function(r){
                self.splice(r, 1);
                return self;
            },
            index : function(i){
                self.splice(i, 1);
                return self;
            },
            where : function(){
                var selected = self.where.apply(self, arguments);
                self.map(function(row, index){if(selected.indexOf(row)>-1) self.splice(index, 1);});
                return self;
            }
        };
    });

    Series.prototype.where = function(left, operator, right){
        var self = this;
        var statement;
        var valid = [/\s+or\s+/i, /\s+between\s+/i, /\s+and\s+/i, /\s+in\s+/i, /\s*<=\s*/, /\s*\>=\s*/,
                     /\s*\!\=\s*(true)/i, /\s*\=\s*(true)/i, /\s*(is)\s*(true)/i, /\s*(not)\s*(true)/i,
                     /\s*\!\=\s*(false)/i, /\s*\=\s*(false)/i, /\s*(is)\s+(false)/i, /\s*(not)\s+(false)/i,
                     /\s*(is)\s+(null)/i, /\s*(not)\s+(null)/i, /\s*\!\=\s*(null)/i, /\s*\=\s*(null)/i, /\s*(null)/i,
                     /\s*\!\=\s*/, /\s*\=\s*/, /\s*\>\s*/, /\s*<\s*/, /\s+is\s+/i, /\s+not\s+/i, /\s+like\s+/i];

        var operators = ['OR', 'BETWEEN', 'AND', 'IN', '<=', '>=', '!=TRUE', '=TRUE', 'IS TRUE', 'NOT TRUE',
                         '!=FALSE', '=FALSE', 'IS FALSE', 'NOT FALSE', 'IS NULL', 'NOT NULL', '!=NULL', '=NULL',
                         'NULL', '!=', '=', '>', '<', 'IS', 'NOT', 'LIKE'];

        var isStatement = function(str){
            if(typeof str=='string'){
                str = str.toLowerCase();
                if(str.indexOf('='        )>-1 ||
                   str.indexOf('>'        )>-1 ||
                   str.indexOf('<'        )>-1 ||
                   str.indexOf(' not '    )>-1 ||
                   str.indexOf(' or '     )>-1 ||
                   str.indexOf(' and '    )>-1 ||
                   str.indexOf(' in '     )>-1 ||
                   str.indexOf(' like '   )>-1 ||
                   str.indexOf('true'     )>-1 ||
                   str.indexOf('false'    )>-1 ||
                   str.indexOf(' is '     )>-1 ||
                   str.indexOf(' between ')>-1 ){ return true; }
            }
            return false;
        };

        var tokenize = function(statement){
            var parts, left, right;
            var evaluate = {};

            for(var i=0; i<valid.length; i++){
                var op = valid[i];

                if(statement.search(op)>-1){
                    if(operators[i]=='BETWEEN'){
                        parts = statement.split(op);
                        left  = parts[0];
                        right = parts[1].split(/\s+and\s+/i);
                        statement = left + ">=" + right[0] + " AND " + left + "<=" + right[1];
                        return tokenize(statement);
                    }
                    else if(operators[i]=='IN'){
                        parts = statement.split(op);
                        parts = parts.map(function(token){return token.trim();});

                        left = parts[0];
                        right = parts[1];

                        if( parts[1].search(/\(|\)|\[|\]/i)>-1 ){
                            right = parts[1].split(/\(|\)|\[|\]/i).filter(Boolean);
                            right = right[0].split(",");
                            right = right.map(function(token){return token.trim();});
                        }
                        else{

                        }
                    }
                    else{
                        parts = statement.split(op);
                        parts = parts.map(function(token){return token.trim();});

                        left  = parts[0];
                        right = parts[1];
                    }

                    evaluate.left  = isStatement(left)  ? tokenize(left)  : left;
                    evaluate.right = isStatement(right) ? tokenize(right) : right;
                    evaluate.operator = operators[i];
                    return evaluate;
                }
            }
        };

        var isTokenized = function(statement){
            return statement.hasOwnProperty('left')  &&
                   statement.hasOwnProperty('right') &&
                   statement.hasOwnProperty('operator');
        };

        var evaluate = function(statement){
            var left, right, op, series;

            if(typeof statement.left=='object'){
                left = evaluate(statement.left);
            }
            else{
                left = statement.left;
            }

            if(typeof statement.right=='object' && isTokenized(statement.right)){
                right = evaluate(statement.right);
            }
            else{
                right = statement.right;
            }

            op = statement.operator.toLowerCase();
            series = Series.from([]);

            if(istype(left)=='Number' || istype(left)=='String'){
                switch(op){
                    case "=":
                        series = self.filter(function(row){return row[left]==right;});
                        break;
                    case "is":
                        series = self.filter(function(row){return row[left]==right;});
                        break;
                    case 'or':
                        series = self.filter(function(row){return row[left]||right;});
                        break;
                    case 'and':
                        series = self.filter(function(row){return row[left]&&right;});
                        break;
                    case 'in':
                        if(istype(right)=='Array')
                            series = self.filter(function(row){
                                for(var r=0; r<right.length; r++)
                                    if(right[r] == row[left]) return row;
                            });
                        else if(typeof right=='string'){
                            if(right.indexOf(".")>-1){
                                right = right.split(".");
                                series = self.filter(function(row){
                                    if(scope[right[0]].column(right[1]).indexOf(row[left])>-1)
                                        return row;
                                });
                            }
                            else{
                                var common = self.column(left).intersect(scope[right].column(left));
                                series = self.filter(function(row){if(common.indexOf(row[left])>-1) return row;});
                            }
                        }
                        break;
                    case '<=':
                        series = self.filter(function(row){return row[left]<=right;});
                        break;
                    case '>=':
                        series = self.filter(function(row){return row[left]>=right;});
                        break;
                    case '=true':
                        series = self.filter(function(row){return row[left]===true;});
                        break;
                    case '!=true':
                        series = self.filter(function(row){return row[left]!==true;});
                        break;
                    case 'is true':
                        series = self.filter(function(row){return row[left]===true;});
                        break;
                    case 'not true':
                        series = self.filter(function(row){return row[left]!==true;});
                        break;
                    case '=false':
                        series = self.filter(function(row){return row[left]===false;});
                        break;
                    case '!=false':
                        series = self.filter(function(row){return row[left]!==false;});
                        break;
                    case 'is false':
                        series = self.filter(function(row){return row[left]===false;});
                        break;
                    case 'not false':
                        series = self.filter(function(row){return row[left]!==false;});
                        break;
                    case 'is null':
                        series = self.filter(function(row){return row[left]===null;});
                        break;
                    case 'not null':
                        series = self.filter(function(row){return row[left]!==null;});
                        break;
                    case '!=null':
                        series = self.filter(function(row){return row[left]!==null;});
                        break;
                    case '=null':
                        series = self.filter(function(row){return row[left]===null;});
                        break;
                    case 'not':
                    case '!=':
                        series = self.filter(function(row){return row[left]!=right;});
                        break;
                    case '>':
                        series = self.filter(function(row){return row[left]>right;});
                        break;
                    case '<':
                        series = self.filter(function(row){return row[left]<right;});
                        break;
                    case 'like':
                        series = self.filter(function(row){ if(row[left]) return row[left].match(new RegExp(right,'i'))!==null; });
                        break;
                    default:
                        series = Series.from([]);
                        break;
                }
            }
            else if(istype(left)=='Array' && istype(right)=='Array'){
                switch(op){
                    case "=":
                        series = left.intersect(right);
                        break;
                    case 'or':
                        series = left.concat(right).unique();
                        break;
                    case 'and':
                        series = left.intersect(right);
                        break;
                    case 'in':
                        series = right.filter(function(r){return r==left;});
                        break;
                    case 'not':
                    case '!=':
                        series = left.diff(right);
                        break;
                    case '<=':
                        series = Series.from([]);
                        break;
                    case '>=':
                        series = Series.from([]);
                        break;
                    case '>':
                        series = Series.from([]);
                        break;
                    case '<':
                        series = Series.from([]);
                        break;
                    default:
                        series = Series.from([]);
                        break;
                }
            }
            series = series===undefined ? Series.from([]) : series;

            inherit(series, self);
            return series;
        };

        if(operator && typeof operator=='string'){
            if(typeof right!='undefined' && typeof left!='undefined')
                return evaluate({left:left, right:right, operator:operator});
            else try{throw new SeriesDataException('Cannot evaluate statement. Malformed syntax.');}catch(e){}
        }
        else if(typeof left=='string' && isStatement(left)){
            statement = tokenize(left);
            return evaluate(statement);
        }
        else try{throw new SeriesDataException('Cannot evaluate statement. Malformed syntax.');}catch(e){}
    };

    Series.prototype.get = function(){
        var selected = this.where(...arguments);
        if(selected.length>1)
            try{ throw SeriesDataException("Multiple entries were found for the given query.", "Parameter Error", 3); }catch(e){}
        return selected[0];
    };

    Series.prototype.merge = function(){
        var s1,
            s2,
            resolve   = false,
            args      = arguments,
            on        = 'index',
            label     = {left:'left', right:'right'},
            join      = 'full', /* full or outer, inner, left, right */
            prototype = Object.getPrototypeOf(this),
            _merge_,
            _join_,
            _resolve_,
            Unresolved;

        Unresolved = function Unresolved(left, right){
            this[label.left ] = left;
            this[label.right] = right;
        };

        Unresolved.prototype = new Unresolved();
        Unresolved.prototype.constructor = Unresolved;
        Unresolved.prototype.toString = function(){return '[object Unresolved]';};

        _resolve_ = function(left, right){
            var p, o, m, k, overlap, matches, promote, demote;

            if(resolve){
                promote = resolve=='left' ? left  : right;
                demote  = promote===left  ? right : left;

                overlap = promote.columns().intersect(demote.columns());
                overlap = overlap.indexOf(on)<0 ? overlap : overlap.delete.index(overlap.indexOf(on));

                if(on=='index'){
                    for(p=0; p<promote.length; p++)
                        if(p<demote.length)
                            for(k in promote[p])
                                if(overlap.indexOf(k)>-1)
                                     delete demote[p][k];
                }
                else{
                    matches = demote.filter(function(row){
                        return promote.filter(function(row2){return row[on]==row2[on];})[0];
                    });

                    for(o=0; o<overlap.length; o++)
                        for(m=0; m<matches.length; m++)
                            for(k in matches[m])
                                if(k==overlap[o])
                                    delete demote[demote.indexOf(matches[m])][overlap[o]];
                }
            }
        };

        _join_ = function(left, right){
            var swap, merged, unique, ix, intersect;

            if(on=='index'){
                if(join!='left' && join!='right' && left.length<right.length){
                    swap  = left;
                    left  = right;
                    right = swap;
                }

                merged = left.map(function(row, index){
                    if(index<right.length)
                        for(var k in right[index]){
                            if(row.hasOwnProperty(k)){
                                if(row[k]!==right[index][k]){
                                    row[k] = new Unresolved(row[k], right[index][k]);
                                    delete right[index][k];
                                }
                            }
                            else row[k]=right[index][k];
                        }
                    return row;
                });
            }
            else{
                if(left.columns().indexOf(on)<0 || right.columns().indexOf(on)<0)
                    try{throw new SeriesDataException("Datasets cannot be merged on specified column: \"" + on + "\". Column not found.", 'Merge Error', 2);}catch(e){}

                else if(left.column(on).duplicates().length>0 || right.column(on).duplicates().length>0)
                    try{throw new SeriesDataException("Datasets cannot be merged on specified column: \"" + on + "\". Index values must be unique.", 'Merge Error', 3);}catch(e){}

                else{
                    unique = Series.from([]);

                    for(var i=0; i<left.length; i++){
                        for(var j=0; j<right.length; j++){
                            L = left[i];
                            R = right[j];

                            /* Found row with matching identifier */
                            if(L[on] == R[on]){
                                for(var k in  R){
                                    if(!L.hasOwnProperty(k))
                                        L[k] = R[k];
                                    else{
                                        if(L[k]!==R[k]){
                                            L[k] = new Unresolved(L[k], R[k]);
                                            delete R[k];
                                        }
                                    }
                                }

                                ix = unique.indexOf(R);
                                if(ix>=0) unique.delete.index(ix);

                                right.delete.row(j);
                            }
                            /* Found row with unique identifier */
                            else{
                                ix = unique.indexOf(R);
                                if(ix<0) unique.push(R);
                            }
                        }
                    }

                    /* null fill */
                    left.map(function(row){
                        for(var u=0; u<unique.length; u++)
                            for(var v in unique[u])
                                if(!row.hasOwnProperty(v))
                                    row[v] = null;
                    });
                    unique.map(function(row){
                        for(var w=0; w<left.length; w++)
                            for(var x in left[w])
                                if(!row.hasOwnProperty(x))
                                    row[x] = null;
                    });

                    merged = left.concat(unique);
                }
            }
            if(merged._index===undefined){
                if(left._index!==undefined && join!='right'){
                    inherit(merged, left);
                }
                else if(right._index!==undefined && join!='left'){
                    inherit(merged, right);
                }
            }
            return merged;
        };

        _merge_ = function(){
            var left,
                right,
                longer,
                merged,
                matches,
                intersect;

            left  = s1.clone();
            right = s2.clone();

            if(join=='full' || join=='outer'){
                _resolve_(left, right);
                merged = _join_(left, right);
            }
            else if(join=='inner'){
                longer  = left>=right ? left : right;
                shorter = longer===left ? right : left;

                if(on!="index"){
                    intersect = [
                        longer.filter(function(row){ return  shorter.column(on).indexOf(row[on])>=0; }),
                        shorter.filter(function(row){ return longer.column(on).indexOf(row[on])>=0;  })
                    ];
                }
                else{
                    intersect = [shorter, longer.splice(0, shorter.length)];
                }

                if(longer===left)
                    _resolve_(intersect[0], intersect[1]);
                else
                    _resolve_(intersect[1], intersect[0]);

                merged = _join_(intersect[0], intersect[1]);
            }
            else if(join=='left'){
                if(on!="index"){
                    intersect = right.column(on).intersect(left.column(on));
                    right = right.filter(function(row){return intersect.indexOf(row[on])>=0;});
                }
                _resolve_(left, right);
                merged = _join_(left, right);
            }
            else if(join=='right'){
                if(on!="index"){
                    intersect = right.column(on).intersect(left.column(on));
                    left = left.filter(function(row){return intersect.indexOf(row[on])>=0;});
                }

                _resolve_(left, right);
                merged = _join_(right, left);
            }
            else{ /* default to full outer join */
                merged = _join_(left, right);
            }
            return merged;
        };

        if(args.length>1){
            if(Series.prototype.isPrototypeOf(args[0]) && Series.prototype.isPrototypeOf(args[1])){
                s1 = args[0];
                s2 = args[1];

                if(args.length>2){
                    on      = args[2].on    !== undefined   ? args[2].on      : on;
                    label   = args[2].label !== undefined   ? args[2].label   : label;
                    join    = args[2].join  !== undefined   ? args[2].join    : join;
                    resolve = args[2].resolve !== undefined ? args[2].resolve : join=='left' || join=='right' ? join : false;
                }
            }
            else{
                s1      = this;
                s2      = args[0];
                on      = args[1].on      !== undefined ? args[1].on      : on;
                label   = args[1].label   !== undefined ? args[1].label   : label;
                join    = args[1].join    !== undefined ? args[1].join    : join;
                resolve = args[1].resolve !== undefined ? args[1].resolve : join=='left' || join=='right' ? join : false;
            }
        }
        else{
            s1 = this;
            s2 = args[0];
        }

        return _merge_();
    };

    Series.prototype.left = Series.prototype.getprop('left', function(){
        return new Promote(this, 'left');
    });

    Series.prototype.right = Series.prototype.getprop('right', function(){
        return new Promote(this, 'right');
    });

    Series.prototype.resolve = function(direction){
        return this.map(function(row){
            for(var k in row)
                if(typeof row[k]=="object" && row[k]!==null && row[k].toString().slice(8, -1)=='Unresolved'){
                    row[k] = row[k][direction];
                }
            return row;
        });
    };

    Series.prototype.col = Series.prototype.getprop('col', function(){
        var series = this;

        var factory = function(series, c){
            var column = {};
            column[Symbol.iterator] = function*(){
                for(var i=0, n=series.length; i<n; i++)
                    yield series[i][c];
            };
            return column;
        };

        var setter = function(target, name, value, receiver){
            var columns;

            if(typeof value!=='undefined' && value instanceof Array)
                target.map(function(row, index){ row[name] = value[index]; return row; });
            else if(typeof value!=='undefined')
                target.map(function(row, index){ row[name] = value; return row; });
        };

        var getter = function(target, name, receiver){
            var columns, proto;
            proto = Object.getPrototypeOf(target);

            columns = target.columns();
            columns.forEach(function(col){
                target[col] = Series.prototype.getprop(col, function(){
                    columns = factory(this, col);
                    return Series.from([...columns]);
                });
            });
            return target[name];
        };
        var proxy = new Proxy(series, { get: getter, set: setter });
        return proxy;
    });

    Series.prototype.row = function(){
        var num,
            num2,
            rows,
            index,
            indecies = [],
            self = this;

        if(arguments.length>1){
            indecies = [...arguments];
            rows = this.filter(function(row, index){if(indecies.indexOf(index)>-1) return row; });
        }
        else if(arguments[0] instanceof Array){
            num  = arguments[0][0] >= 0 ? arguments[0][0] : self.length + arguments[0][0];
            num2 = arguments[0][1] >= 0 ? arguments[0][1] : self.length + arguments[0][1];
            num2 = num2 < num ? self.length : num2;
            rows = self.between(num, num2);
            for(var i=num;i<num2+1; i++)
                indecies.push(i);
        }
        else if(typeof arguments[0]=='string'){
            rows = self.where(arguments[0]);
            indecies.concat( self.filter(function(r, i){if(rows.indexOf(r)>-1) return i;}) );
        }
        else{
            num = arguments[0] >= 0 ? arguments[0] : self.length + arguments[0];
            rows = Series.from([ self[num] ]);
            indecies.push(num);
        }

        return new Proxy(rows, {
            get: function(target, name){
                return target[name];
            },
            set: function(target, name, value){
                self.map(function(row, index, series){
                    var selected = indecies.indexOf(index);

                    if(selected > -1){
                        if(value instanceof Series || value instanceof Array)
                            row[name] = value[selected];
                        else if(value instanceof Function)
                            row[name] = value(row[name], row, index, series);
                        else
                            row[name] = value;
                        return row;
                    }
                });
            },
        });
    };

    Series.prototype.insert = function(values, position){
        var row  = {};
        var cols = this.columns();

        if(typeof this._index!='undefined' && this.index().is.numeric())
            values = [this.column(this._index).last(1).pop()+1].concat(values);

        if(values.length < cols.length)
            try{
                throw new SeriesDataException("The number of values given do not match the number of columns.", "Range Error");
            }
            catch(e){}

        for(var i=0, n=values.length; i<n; i++)
            row[cols[i]] = values[i];
        this.push(row);
        return this;
    };

    Series.prototype.all = function(condition){
        if(typeof condition=='function')
            return this.every(function(item){ return condition(item); });
        return this.every(function(item){ return item==condition; });
    };

    Series.prototype.entirely = Series.prototype.all;

    Series.prototype.partly = function(condition){
        if(typeof condition=='function')
            return this.some(function(item){ return condition(item); });
        return this.some(function(item){ return item==condition; });
    };

    Series.prototype.show = function(limit, wrap){
        var row,
            table   = [],
            series  = this;
            columns = series.columns();

        if(limit instanceof Array)
            series = series.row(limit);
        else if( limit==null || typeof limit=='undefined' )
            series = this;
        else
            series = limit >=0 ? series.row([0, limit-1]) : series.row([limit, series.length-1]);

        if(typeof console.table=='undefined' || environment=='server'){
            return series.tabular(wrap);
        }

        function Row(columns, values){
            for(var c=0; c<columns.length; c++)
                this[columns[c]] = values[columns[c]];
        }

        for(var i=0; i<series.length; i++){
            row = new Row(columns, series[i]);
            table.push(row);
        }

        if(table.length<1)
            table.push((new Row([],[])));

        console.table(table);
        return series;
    };

    Series.prototype.tabular = function(wrap){
        var hr,
            row,
            col,
            spc,
            cut,
            repeat,
            values,
            display,
            longest,
            column,
            segment,
            remainder,
            offset  = 0,
            wrap    = wrap ? wrap : 80,
            width   = [],
            max     = [],
            spacer  = 4,
            total   = 0,
            wrapped = [],
            cutoffs = [],
            selects = [],
            columns = Series.from(['index'].concat(this.columns()));
            series  = this;

        repeat = function(length, char){
           return Array(length>0 ? length+1 : 1).join(char!==undefined ? char : " ");
        };

        render = function(table, columns, offset){
            table.forEach(function(row, index){
                if(index===0){
                    col = "";
                    spc = [];
                    hr  = "";

                    columns.forEach(function(value, index){
                        index = index!==0 ? offset + index : index;
                        spc.push( max[index] - String(value).length);
                    });
                    columns.forEach(function(value, index){
                        col += value + repeat(spc[index] + spacer);
                        hr  += repeat(String(value).length, "-") + repeat(spc[index] + spacer);
                    });

                    console.log(col);
                    console.log(hr);
                }
                console.log(row);
            });
            return "count: " + series.count;
        };

        display = function(series, columns, offset){
            table = [];
            for(var i=0; i<series.length; i++){
                row = i + repeat(max[0] - String(i).length + spacer);
                spc = [];

                values = [];
                columns.forEach(function(c, n){if(n>0)values.push(String(series[i][c]));});
                values.forEach(function(value, index){ spc.push(max[offset + index + 1] - value.length); });

                values.forEach(function(value, index){ row += value + repeat(spc[index] + spacer); });

                table.push(row);
            }
            return render(table, columns, offset);
        };

        columns.forEach(function(column, index){
            values = [];
            series.forEach(function(row, index){ values.push(column!='index' ? String(row[column]) : String(index)); });
            longest = Series.from([column].concat(values)).longest().length;
            max.push(longest);
        });

        width = Series.from(max).sum() + spacer * columns.count;

        if(width > wrap){
            max.forEach(function(width, index){
                if(index>0){
                    var c = columns[index];

                    if(total + width + spacer >= wrap && index!=max.length-1){
                        cutoffs.push(selects);
                        selects = [c];
                        total = width + spacer;
                    }
                    else if(index==max.length-1){
                        selects.push(c);
                        cutoffs.push(selects);
                        total = 0;
                        selects = [];
                    }
                    else{
                        selects.push(c);
                        total += width + spacer;
                    }
                }
            });

            remainder = series;

            cutoffs.forEach(function(selects, index){
                cut       = cutoffs[index];
                column    = cut[cut.length - 1];
                segment   = remainder.left.select(column);
                remainder = series.right.select(columns[columns.indexOf(column)+1]);
                wrapped.push(segment);
            });

            for(var i=0; i<wrapped.length; i++){
                console.log("\n");
                offset += i > 0 ? cutoffs[i-1].length : 0;
                columns = Series.from(['index'].concat(cutoffs[i]));
                display(wrapped[i], columns, offset);
            }
        }
        else{
            offset = 0;
            columns = Series.from(['index'].concat(this.columns()));
            console.log("\n");
            display(series, columns, offset);
        }
        return ["count", series.count];
    };

    if(environment=='server'){
        exports.Series = SeriesFactory;
        return exports;
    }

    scope.Series = SeriesFactory;
    return SeriesFactory;

}).call(this, typeof window=='undefined' ? global : window);