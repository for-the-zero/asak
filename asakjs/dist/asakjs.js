var asakjs = (function (exports) {
    'use strict';

    function greet() {
      return 'Hello from asakjs!';
    }
    console.log(greet());

    exports.greet = greet;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=asakjs.js.map
