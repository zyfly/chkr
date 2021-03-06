var c = exports.c = {};
var t = exports.t = {};

var Err = require('./err');
var util = require('util');
var id = require('./id');

t.Null = id.judge(util.isNullOrUndefined, 'is not Null').called('Null');
t.Any = id.judge(v => !util.isNullOrUndefined(v), 'is Null').called('Any');

c.Or = function() {
  var Types = [].slice.apply(arguments);
  return id.match(value => {
    var ret;
    var es = [];
    var matchSome = Types.some(Type => {
      try {
        ret = Type(value);
      }
      catch(e) {
        es.push(e.inspect());
        return false;
      }
      return true;
    });
    if(matchSome) return ret;
    throw new Err(es.join('|'), 'match none of types');
  }).called(() => Types.map(Type => Type.show()).join('|'));
};

c.Optional = Type => c.Or(t.Null, Type).called(() => 'Optional ' + Type.show());

c.Default = (Type, defaultValue) => id.match(value => {
  if(util.isNullOrUndefined(value)) return Type(defaultValue);
  return Type(value);
}).called(() => Type.show() + ' Default ' + defaultValue);

c.Val = value =>
id.judge(real => real == value, 'is not eq to ' + value)
.called(() => 'Value ' + value);

t.Num = t.Any
.judge(v => !isNaN(v) && v !== '', 'is not a Num')
.match(Number).called('Num');

t.Str = t.Any.match(String).called('Str');

t.Bool = t.Any.match(value => {
  var boolStr = value.toString();
  if(boolStr === 'true') return true;
  if(boolStr === 'false') return false;
  throw new Err(value, 'is not a Bool');
}).called('Bool');

t.Date = t.Any
.match(value => new Date(value))
.judge(v => v.toString() != 'Invalid Date', 'is not a Date')
.called('Date');

t.Json = c.Or(
  t.Any.judge(util.isObject, 'is not an Obj'),
  t.Str.match(JSON.parse).judge(util.isNullOrUndefined, 'json is null')
).called('Json');

t.Obj = t.Json.judge(v => !util.isArray(v), 'is an Arr not an Obj').called('Obj');

t.Arr = t.Json.judge(util.isArray, 'is an Obj not an Arr').called('Arr');

t.Fn = t.Any.judge(util.isFunction, 'is not a function').called('Fn');

c.Map = (KeyType, ValueType) =>
t.Obj.match(obj => Object.keys(obj).reduce((ret, key) => {
  try {
    var newkey = KeyType(key);
  }
  catch(e) {
    throw e.key('{' + key + '}');
  }
  try {
    var newvalue = ValueType(obj[key]);
  }
  catch(e) {
    throw e.key(key);
  }
  ret[newkey] = newvalue;
  return ret;
}, {})).called(() => util.format('{%s: %s}', KeyType.show(), ValueType.show()));

c.Obj = TypeMap =>
t.Obj.match(obj => Object.keys(TypeMap).reduce((ret, key) => {
  try {
    var result = TypeMap[key](obj[key]);
    if(!util.isNullOrUndefined(result))
      ret[key] = result;
  }
  catch(e) {
    throw e.key(key);
  }
  return ret;
}, {})).called(() => {
  var fields = Object.keys(TypeMap)
  .map(key => '  ' + key + ': ' + TypeMap[key].show().replace(/\n/g, '\n  '))
  .join(',\n');
  return util.format("{\n%s\n}", fields);
});

c.Arr = Type => t.Arr.match(arr => arr.map((item, i) => {
  try {
    var result = Type(item);
  }
  catch(e) {
    throw e.index(i);
  }
  return result;
})).called(() => util.format('[%s]', Type.show()));
