(function(global){
    var scope = this;

    var istype = function(obj){
        if(obj===null)
            return "Null";
        if(obj instanceof Series || obj instanceof BaseSeries)
            return obj.toString(obj).slice(8, -1);
        //if(obj.toString)
            //return obj.toString().slice(8, -1);
        return Object.prototype.toString.call(obj).slice(8, -1);
    };

    var Promote = function(a, d){
        self = this;

        this.direction = d;

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
    };

    var SeriesDataException = function SeriesDataException(message, name, code){
        this.message = message;
        this.code = 1;
        this.name = !name ? 'SeriesDataException' : name;
        console.error(this.message);
    };
    SeriesDataException.prototype = new Error();

    var BaseSeries = function BaseSeries() {
        var self = this;
        var series = [];
        var args = (arguments[0] instanceof Array) ? arguments[0] : arguments;

        series.push.apply(series, args);
        Object.setPrototypeOf(series, BaseSeries.prototype);
        return series;
    };
    BaseSeries.prototype = Array.prototype;
    BaseSeries.prototype.constructor = BaseSeries;

    var Series = function Series(){
        if(arguments.length){
            if(Series.prototype.isPrototypeOf(arguments[0])){
                //if(this!==scope)
            }
            else if(typeof arguments[0]=='object'){

            }
        }
        else{
        }

        var args = (arguments[0] instanceof Array) ? arguments[0] : arguments;
        var series = new BaseSeries(args);

        Object.setPrototypeOf(series, Series.prototype);
        return series;
    };

    Series.prototype = BaseSeries.prototype;
    Series.prototype.constructor = Series;
    Series.prototype.toString = function(){return '[object Series]';};

    Series.from = function(array){
        return new Series(array);
    };

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

    Series.prototype.groupby = function(key) {
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

    Series.prototype.clone = function(){
        return this.slice(0);
    };

    Series.prototype.deepcopy = function(){
        return this.map(function(a){return Object.assign({}, a);});
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

    Series.prototype._columns = undefined;

    Series.prototype.columns = function(cols){
        var proto = Object.getPrototypeOf(this);
        if(cols===undefined){
            proto._columns = Series.from([]);

            for(var i=0; i<this.length; i++)
                proto._columns = proto._columns.concat(Object.keys(this[i]));

            proto._columns = proto._columns.unique();
            return proto._columns;
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
        }
    };

    Series.prototype.equal = function(b){
        var a = this;
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

    Series.prototype.top = function(limit){
        limit = limit===undefined ? 10 : limit;
        return this.slice(0, limit);
    };

    Series.prototype.last = function(limit){
        limit = limit===undefined ? 11 : limit+1;
        return this.slice(this.length-limit, this.length-1);
    };

    Series.prototype.limit = function(limit){
        limit = limit===undefined ? 20 : limit;
        return this.slice(0, limit);
    };

    Series.prototype.min = function(c){
        return Math.min.apply(null, this.column(c));
    };

    Series.prototype.max = function(c){
        return Math.max.apply(null, this.column(c));
    };

    Series.prototype.avg = function(c){
        return this.sum(c) / this.length;
    };

    Series.prototype.sum = function(c){
        return this.column(c).reduce(function(a, b) { return a + b; });
    };

    Series.prototype.isNumeric = function(col){
        return this.filter(function(row){
            return !isNaN(parseFloat(row[col])) && isFinite(row[col]);
        }).length > 0;
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
       return this.slice(start, end+1);
    };

    Series.prototype.segment = function(start, end){
        return this.splice(start, (end+1)-start);
    };

    Series.prototype.select = function(...args){
        var selected = this.map(function(row){
            var copy = {};
            for(var col in row)
                if(args.indexOf(col)>-1)
                    copy[col] = row[col];
            return copy;
        });
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

    Series.prototype.getprop = (function(prop, getter){
        Object.defineProperty(Series.prototype, prop, {
            get: getter,
            set: function(){prop = this.getprop.call(this);},
            configurable: true
        });
    }).bind(Series.prototype);

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

        var istype = function(obj){
            if(obj===null)
                return "Null";
            return Object.prototype.toString.call(obj).slice(8, -1);
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
                        series = self.filter(function(row){ if(row[left]) return row[left].match(right)!==null; });
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

    Series.prototype.merge = function(){
        var s1,
            s2,
            resolve   = false,
            args      = arguments,
            on        = 'index',
            label     = {left:'left', right:'right'},
            join      = 'full', /* full or outer, inner, left, right */
            prototype = Object.getPrototypeOf(this);

        var Unresolved = function Unresolved(left, right){ this[label.left ] = left; this[label.right] = right; };
        Unresolved.prototype = new Unresolved();
        Unresolved.prototype.constructor = Unresolved;
        Unresolved.prototype.toString = function(){return '[object Unresolved]';};

        var _join_ = function(left, right){
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
            return merged;
        };

        var merge = function(){
            var left,
                right,
                longer,
                merged,
                matches,
                intersect;

            left  = s1.deepcopy();
            right = s2.deepcopy();

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

        var _resolve_ = function(left, right){
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

        return merge();
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

    Series.prototype.show = function(){
        var row,
            table = [],
            columns = this.columns();

        function Row(columns, values){
            for(var c=0; c<columns.length; c++)
                this[columns[c]] = values[columns[c]];
        }

        for(var i=0; i<this.length; i++){
            row = new Row(columns, this[i]);
            table.push(row);
        }

        if(table.length<1)
            table.push((new Row([],[])));

        console.table(table);
        return this;
    };

    scope.Series = Series;
    //scope.BaseSeries = BaseSeries;

}).call(this, window);