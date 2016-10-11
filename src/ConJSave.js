/**
 * Created by pdyxs on 10/09/2016.
 */
import _ from 'underscore';
import ConJSON from './ConJSON';

class ConJSave extends ConJSON {
  constructor() {
    super();
  }

  init() {
    super.init();
    this.updateSaved();
  }

  loadJSON(data) {
    super.loadJSON(data);
    this.updateSaved();
    return this;
  }

  updateSaved() {
    this._lastSaved = this.toObj();
  }

  get changed() {
    return !_.isEqual(this.toObj(), this._lastSaved);
  }
}

export default ConJSave;