function flatten(obj, prefix) {
  prefix = prefix || '';
  var result = {};
  if (!obj || typeof obj !== 'object') return result;
  var entries = Object.entries(obj);
  for (var i = 0; i < entries.length; i++) {
    var key = entries[i][0];
    var value = entries[i][1];
    var fullKey = prefix ? prefix + '.' + key : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value && typeof value === 'object') {
      var nested = flatten(value, fullKey);
      for (var k in nested) {
        result[k] = nested[k];
      }
    }
  }
  return result;
}

var zh = {
  tier: {
    pro: "专业版",
    super: "旗舰版",
    perMonth: "/月",
    notSubscribed: "未开通"
  }
};

var result = flatten(zh);
print("tier.pro:", result["tier.pro"]);
print("tier.super:", result["tier.super"]);
print("tier.perMonth:", result["tier.perMonth"]);
print("has tier.pro:", "tier.pro" in result);
