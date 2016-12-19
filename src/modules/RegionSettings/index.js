import RcModule from '../../lib/RcModule';
import getRegionSettingsReducer, {
  getCountryCodeReducer,
  getAreaCodeReducer,
} from './getRegionSettingsReducer';
import moduleStatus from '../../enums/moduleStatus';
import regionSettingsMessages from '../RegionSettings/regionSettingsMessages';
import actionTypes from './actionTypes';

export default class RegionSettings extends RcModule {
  constructor({
    storage,
    accountInfo,
    dialingPlan,
    alert,
    tabManager,
    ...options,
  }) {
    super({
      ...options,
      actionTypes,
    });
    this._storage = storage;
    this._alert = alert;
    this._dialingPlan = dialingPlan;
    this._accountInfo = accountInfo;
    this._tabManager = tabManager;

    this._countryCodeKey = 'regionSettingsCountryCode';
    this._areaCodeKey = 'regionSettingsAreaCode';
    this._reducer = getRegionSettingsReducer(this.actionTypes);

    this._storage.registerReducer({
      key: this._countryCodeKey,
      reducer: getCountryCodeReducer(this.actionTypes),
    });
    this._storage.registerReducer({
      key: this._areaCodeKey,
      reducer: getAreaCodeReducer(this.actionTypes),
    });
  }
  initialize() {
    let plans;
    this.store.subscribe(() => {
      if (
        this._storage.ready &&
        this._dialingPlan.ready &&
        this._accountInfo.ready &&
        this.status === moduleStatus.pending
      ) {
        this.store.dispatch({
          type: this.actionTypes.init,
        });
        if (!this._tabManager || this._tabManager.active) {
          this.checkRegionSettings();
        }
        plans = this._dialingPlan.plans;
        this.store.dispatch({
          type: this.actionTypes.initSuccess,
        });
      } else if (
        !this._storage.ready &&
        this.ready
      ) {
        this.store.dispatch({
          type: this.actionTypes.reset,
        });
      } else if (
        this.ready &&
        plans !== this._dialingPlan.plans
      ) {
        plans = this._dialingPlan.plans;
        if (!this._tabManager || this._tabManager.active) {
          this.checkRegionSettings();
        }
      }
    });
  }

  get status() {
    return this.state.status;
  }

  get ready() {
    return this.state.status === moduleStatus.ready;
  }

  get availableCountries() {
    return this._dialingPlan.plans;
  }

  validateAreaCode(code) {
    return !(
      code.length > 0 &&
      (
        code.length !== 3 ||
        code[0] === '0'
        // /^(0|1|8)/.test(code)
      )
    );
  }

  checkRegionSettings() {
    let countryCode = this._storage.getItem(this._countryCodeKey);
    if (countryCode && !this._dialingPlan.plans.find(plan => (
      plan.isoCode === countryCode
    ))) {
      countryCode = null;
      this._alert.warning({
        message: regionSettingsMessages.dialingPlansChanged,
        ttl: 0
      });
    }
    if (!countryCode) {
      countryCode = this._dialingPlan.plans.find(plan => (
        plan.isoCode === this._accountInfo.country.isoCode
      )).isoCode;
      this.store.dispatch({
        type: this.actionTypes.setData,
        countryCode,
        areaCode: '',
      });
    }
  }

  setData({
    areaCode,
    countryCode,
  }) {
    if (typeof areaCode !== 'undefined' && !this.validateAreaCode(areaCode)) {
      this._alert.danger({
        message: regionSettingsMessages.areaCodeInvalid,
      });
    } else {
      this.store.dispatch({
        type: this.actionTypes.setData,
        countryCode,
        areaCode,
      });
      this._alert.info({
        message: regionSettingsMessages.saveSuccess,
      });
    }
  }

  setCountryCode(countryCode) {
    this.setData({
      countryCode,
    });
  }

  setAreaCode(areaCode) {
    this.setData({
      areaCode,
    });
  }

  get countryCode() {
    return this._storage.getItem(this._countryCodeKey) || 'US';
  }

  get areaCode() {
    return this._storage.getItem(this._areaCodeKey) || '';
  }
}