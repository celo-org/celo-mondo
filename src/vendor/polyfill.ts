// @ts-expect-error
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// eslint-disable-next-line import/no-anonymous-default-export
export default {}