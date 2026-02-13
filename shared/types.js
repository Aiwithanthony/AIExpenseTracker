"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionStatus = exports.ExpenseSource = exports.SubscriptionTier = void 0;
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["PREMIUM"] = "premium";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
var ExpenseSource;
(function (ExpenseSource) {
    ExpenseSource["APP"] = "app";
    ExpenseSource["VOICE_APP"] = "voice_app";
    ExpenseSource["WHATSAPP"] = "whatsapp";
    ExpenseSource["TELEGRAM"] = "telegram";
    ExpenseSource["RECEIPT_SCAN"] = "receipt_scan";
})(ExpenseSource || (exports.ExpenseSource = ExpenseSource = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["CANCELED"] = "canceled";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["TRIALING"] = "trialing";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
//# sourceMappingURL=types.js.map