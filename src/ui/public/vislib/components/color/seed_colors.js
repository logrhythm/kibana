define(function () {
  /*
   * Using a random color generator presented awful colors and unpredictable color schemes.
   * So we needed to come up with a color scheme of our own that creates consistent, pleasing color patterns.
   * The order allows us to guarantee that 1st, 2nd, 3rd, etc values always get the same color.
   * Returns an array of 72 colors.
   */

  return function SeedColorUtilService() {
    return [
      '#007DC3',
      '#002D56',
      '#80D0FF',
      '#B3B3B3',
      '#7F72C3',
      '#71C0C0',
      '#548C8C',
      '#174380',
      '#C372A2',
      '#6D1382'
    ];
  };
});
