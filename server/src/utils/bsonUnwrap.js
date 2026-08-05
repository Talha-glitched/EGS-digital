/**
 * Recursively unwraps Extended BSON JSON objects ($numberInt, $numberLong, $numberDouble, $oid, $date)
 * into standard primitive numbers, strings, and dates.
 */
export function unwrapBson(val) {
  if (val === null || val === undefined) return val;
  
  if (Array.isArray(val)) {
    return val.map(unwrapBson);
  }

  if (typeof val === 'object') {
    // Check for BSON type wrappers
    if (val.$numberInt !== undefined) return Number(val.$numberInt);
    if (val.$numberLong !== undefined) return Number(val.$numberLong);
    if (val.$numberDouble !== undefined) return Number(val.$numberDouble);
    if (val.$oid !== undefined) return String(val.$oid);
    if (val.$date !== undefined) {
      if (typeof val.$date === 'object' && val.$date.$numberLong !== undefined) {
        return new Date(Number(val.$date.$numberLong)).toISOString();
      }
      return new Date(val.$date).toISOString();
    }

    const cleanObj = {};
    for (const key of Object.keys(val)) {
      cleanObj[key] = unwrapBson(val[key]);
    }
    return cleanObj;
  }

  return val;
}

export default unwrapBson;
