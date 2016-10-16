/**
 * Created by pdyxs on 10/09/2016.
 */
import _ from 'underscore';

const VARIABLE_TYPES = {
  SIMPLE: 'Simple',
  JSON: 'JSON',
  JSON_ARRAY: 'JSON Array',
  JSON_OBJECT: 'JSON Object',
  CLONEABLE: 'Cloneable',
  LOADER: 'Loader'
};

const COLLECTION_OPERATIONS = {
  ADD: 'add',
  REMOVE: 'remove',
  GET: 'get'
};

class ConJSON {
  constructor() {
  }

  init() {
    _.each(this.spec, function(opts, id) {
      var d = opts.default;
      if (_.isFunction(d)) {
        d = d.call(this);
      }

      if (opts.optional) {
        return;
      }

      if (opts.type === VARIABLE_TYPES.SIMPLE) {
        this[id] = d;
      } else if (opts.type === VARIABLE_TYPES.CLONEABLE) {
        this[id] = d;
      } else if (opts.type === VARIABLE_TYPES.JSON) {
        this[id] = null;
      } else if (opts.type === VARIABLE_TYPES.JSON_OBJECT) {
        this[id] = {};
        if (opts.singular) {
          _.each(COLLECTION_OPERATIONS, function(op) {
            let fnName = op + opts.singular;
            if (this[fnName]) {
              this[fnName] = _.bind(this[fnName], this);
              fnName = '_' + fnName;
            }
            this[fnName] = _.bind(this['_' + op + 'ObjectAttr'], this, id);
          }, this);
        }
      } else if (opts.type === VARIABLE_TYPES.JSON_ARRAY) {
        this[id] = [];
        if (opts.singular) {
          _.each(COLLECTION_OPERATIONS, function(op) {
            let fnName = op + opts.singular;
            if (this[fnName]) {
              this[fnName] = _.bind(this[fnName], this);
              fnName = '_' + fnName;
            }
            this[fnName] = _.bind(this['_' + op + 'ArrayAttr'], this, id);
          }, this);
        }
      } else if (opts.type === VARIABLE_TYPES.LOADER) {
        this[id] = d;
      }
    }, this);
    this.postInit();
  }

  postInit() {
  }

  _addObjectAttr(attr, obj, id) {
    if (!(obj instanceof this.spec[attr].cls)) {
      if (obj && obj.id) {
        obj = ConJSON.create(this, this.spec[attr], obj || {}, obj.id);
      } else {
        obj = ConJSON.create(this, this.spec[attr], obj || {});
      }
      //it's a json loaded thing!
      id = obj.id;
    } else if (!id) {
      id = obj.id;
    }
    this[attr][id] = obj;
    return obj;
  }

  _removeObjectAttr(attr, obj) {
    if (_.isObject(obj)) {
      obj = obj.id;
    }
    var ret = this[attr][obj];
    delete this[attr][obj];
    return ret;
  }

  _getObjectAttr(attr, id) {
    return this[attr][id];
  }

  _addArrayAttr(attr, obj) {
    if (!(obj instanceof this.spec[attr].cls)) {
      //it's a json loaded thing!
      obj = ConJSON.create(this, this.spec[attr], obj || {});
    }
    this[attr].push(obj);
    return obj;
  }

  _removeArrayAttr(attr, obj) {
    if (!_.isObject(obj)) {
      //obj is an id
      obj = _.findWhere(this[attr], {id: obj});
    }
    this[attr] = _.without(this[attr], obj);
    return obj;
  }

  _getArrayAttr(attr, id) {
    return _.findWhere(this[attr], {id: id});
  }

  static get VARIABLE_TYPES() {
    return VARIABLE_TYPES;
  }

  toJSON() {
    return JSON.stringify(this.toObj());
  }

  static toJSONArray(objects) {
    return _.reduce(objects, function(current, obj) {
      current.push(obj.toObj());
      return current;
    }, []);
  }

  static toJSONObject(objects) {
    return _.reduce(objects, function(current, obj) {
      current[obj.id] = obj.toObj();
      return current;
    }, {});
  }

  get spec() {
    return {};
  }

  toObj() {
    return _.reduce(this.spec, function(current, opts, id) {
      if (opts.optional && !this[id]) {
        return current;
      }

      if (opts.type === VARIABLE_TYPES.SIMPLE) {
        current[id] = this[id];
      } else if (opts.type === VARIABLE_TYPES.CLONEABLE) {
        current[id] = _.clone(this[id]);
      } else if (opts.type === VARIABLE_TYPES.JSON) {
        if (this[id]) {
          current[id] = this[id].toObj();
          if (opts.id) {
            current[opts.id] = this[id].id;
          }
        }
      } else if (opts.type === VARIABLE_TYPES.JSON_OBJECT) {
        current[id] = ConJSON.toJSONObject(this[id]);
      } else if (opts.type === VARIABLE_TYPES.JSON_ARRAY) {
        current[id] = ConJSON.toJSONArray(this[id]);
      } else if (opts.type === VARIABLE_TYPES.LOADER) {
        current[id] = opts.toObj.call(this, this[id]);
      }
      return current;
    }, {}, this);
  }

  static __checkArgs(obj, args, data, id, progress) {
    function checkArgs(args) {
      var ret = args;
      if (_.isFunction(args)) {
        ret = args.call(obj, data, id, progress);
      }
      return ret;
    }

    return checkArgs.call(obj, args);
  }

  static create(obj, spec, data, id) {
    return ConJSON.fromJSON(spec.cls, data,
      ConJSON.__checkArgs(obj, spec.args, data, id), id);
  }

  doPostLoad() {
    _.each(this.spec, function(opts, id) {
      if (!this[id]) {
        return;
      }
      if (opts.type === VARIABLE_TYPES.JSON) {
        this[id].doPostLoad();
      } else if (opts.type === VARIABLE_TYPES.JSON_OBJECT ||
        opts.type === VARIABLE_TYPES.JSON_ARRAY) {
        _(this[id]).each(function(obj) { obj.doPostLoad(); });
      } else if (opts.type === VARIABLE_TYPES.LOADER) {
        if (_.isFunction(this[id])) {
          this[id] = this[id].call(this);
        }
      }
    }, this);
  }

  loadJSON(data) {
    _.each(this.spec, function(opts, id) {
      if (!_.isUndefined(data[id])) {
        var obj = null;

        if (opts.type === VARIABLE_TYPES.SIMPLE) {
          obj = data[id];
        } else if (opts.type === VARIABLE_TYPES.CLONEABLE) {
          obj = _.clone(data[id]);
        } else if (opts.type === VARIABLE_TYPES.JSON) {
          let oid = opts.id ? data[opts.id] : undefined;
          obj = ConJSON.create(this, opts, data[id], oid);
        } else if (opts.type === VARIABLE_TYPES.JSON_OBJECT) {
          obj = ConJSON.objectFromJSON(this, opts, data[id]);
        } else if (opts.type === VARIABLE_TYPES.JSON_ARRAY) {
          obj = ConJSON.arrayFromJSON(this, opts, data[id]);
        } else if (opts.type === VARIABLE_TYPES.LOADER) {
          var o = opts.fromObj.call(this, data[id]);
          if (_(o).isFunction()) {
            var p = o.call(this);
            obj = p || o;
          } else {
            obj = o;
          }
        }

        if (!_.isNull(obj)) {
          this[id] = obj;
        }
      }
    }, this);
    this.postLoadJSON();
    this.postInit();
    return this;
  }

  postLoadJSON() {
  }

  static fromJSON(cls, data, args, id) {
    var args = args || [];

    if (id) {
      args.push(id);
    }
    if (_.isFunction(cls.loadArgsFromJSON)) {
      args = cls.loadArgsFromJSON(args, data, id);
      if (args === null) {
        return;
      }
    }
    if (_.isFunction(cls.updateJSONData)) {
      data = cls.updateJSONData(args, data, id);
    }
    args = [null].concat(args);
    return (new (Function.prototype.bind.apply(cls, args))).loadJSON(data);
  }

  static arrayFromJSON(p, spec, data) {
    return _.reduce(data, function(current, obj) {
      var args = ConJSON.__checkArgs(p, spec.args, obj, undefined, current);
      var no = ConJSON.fromJSON(spec.cls, obj, args);
      if (no) {
        current.push(no);
      }
      return current;
    }, []);
  }

  static objectFromJSON(p, spec, data) {
    return _.reduce(data, function(current, obj, id) {
      var args = ConJSON.__checkArgs(p, spec.args, obj, id, current);
      var no = ConJSON.fromJSON(spec.cls, obj, _.clone(args), id);
      if (no) {
        current[id] = no;
      }
      return current;
    }, {});
  }
}

export default ConJSON;