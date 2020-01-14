angular.module('rt.popup', [])
    .factory('Popup', [
        '$window', '$document', '$timeout', '$compile', '$parse',
        function ($window, $document, $timeout, $compile, $parse) {
            var openedPopup = null;
            var template = '<div class="popover"><div ng-include="popupView" onload="$reposition()"></div></div>';

            // Padding towards edges of screen.
            var padding = 10;

            function hidePopup() {
                if (!openedPopup) {
                    return;
                }

                var popup = openedPopup;
                openedPopup = null;

                $timeout(function () {
                    $parse(popup.options.popupHidden)(popup.scope);
                    popup.el.remove();
                });
            }

            function accept() {
                if (!openedPopup) {
                    return;
                }
                var popup = openedPopup;

                $timeout(function () {
                    $parse(popup.options.popupAction)(popup.scope);
                    popup.el.remove();
                });
            }

            function extend(obj, values) {
                for (var key in values) {
                    if (!obj[key]) {
                        obj[key] = values[key];
                    }
                }
            }

            function showPopup(anchor, scope, attrs) {
                extend(attrs, {
                    popupPlacement: 'right',
                    popupClass: '',
                    popupShown: '',
                    popupHidden: '',
                    popupOverlap: 5 // Overlap with anchor element
                });

                scope.popupView = attrs.popupShow;
                scope.hidePopover = hidePopup;
                scope.accept = accept;

                $timeout(function () {
                    makePopup(anchor, scope, attrs);
                });
            }

            function offset(el) {
                var rect = el[0].getBoundingClientRect();
                return {
                    width: rect.width || el.prop('offsetWidth'),
                    height: rect.height || el.prop('offsetHeight'),
                    top: rect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
                    left: rect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
                };
            }

            function fixPosition(scope, anchor, element, arrow, options) {
                var $element = $(element);
                var popupPosition = null;
                var arrowPosition = null;
                var anchorPoint = null;
                var anchorGeom = offset(anchor);

                var placement = options.popupPlacement;
                var extra_class = options.popupClass;

                var maxHeight = $window.innerHeight - 2 * padding;

                var overlap = options.popupOverlap;

                // Calculate popup position
                if (placement === 'right') {
                    anchorPoint = {
                        top: anchorGeom.top + anchorGeom.height / 2,
                        left: anchorGeom.left + anchorGeom.width - overlap + 10
                    };

                    popupPosition = {
                        top: anchorPoint.top - $element.height() / 2,
                        left: anchorPoint.left
                    };

                    // Clamp for edge of screen
                    popupPosition.top = Math.max(padding, popupPosition.top);

                    arrowPosition = {
                        top: anchorPoint.top - popupPosition.top
                    };
                } else if (placement === 'left') {
                    anchorPoint = {
                        top: anchorGeom.top + anchorGeom.height / 2,
                        left: anchorGeom.left + overlap - 10
                    };

                    popupPosition = {
                        top: anchorPoint.top - $element.height() / 2,
                        top: anchorPoint.top - $element.height() / 2,
                        left: anchorPoint.left - $element.width()
                    };

                    // Clamp for edge of screen
                    popupPosition.top = Math.max(padding, popupPosition.top);

                    arrowPosition = {
                        top: anchorPoint.top - popupPosition.top
                    };
                } else if (placement === 'bottom') {
                    anchorPoint = {
                        top: anchorGeom.top + anchorGeom.height,
                        left: anchorGeom.left + anchorGeom.width / 2
                    };

                    popupPosition = {
                        top: anchorPoint.top - overlap,
                        left: anchorPoint.left - $element.width() / 2
                    };

                    // Clamp for edge of screen
                    popupPosition.left = Math.max(padding, popupPosition.left);
                    maxHeight -= popupPosition.top;

                    arrowPosition = {
                        left: anchorPoint.left - popupPosition.left
                    };
                } else if (placement === 'top') {
                    anchorPoint = {
                        top: anchorGeom.top - $element.outerHeight(),
                        left: anchorGeom.left + anchorGeom.width / 2
                    };

                    popupPosition = {
                        top: anchorPoint.top + overlap,
                        left: anchorPoint.left - $element.width() / 2
                    };

                    // Clamp for edge of screen
                    popupPosition.left = Math.max(padding, popupPosition.left);
                    maxHeight -= popupPosition.top;

                    arrowPosition = {
                        left: anchorPoint.left - popupPosition.left
                    };
                } else {
                    throw new Error('Unsupported placement ' + placement);
                }

                $element.removeClass('left right bottom top');
                $element.addClass(placement);
                if (extra_class) {
                    $element.addClass(extra_class);
                }
                $element.css({
                    top: popupPosition.top + 'px',
                    left: popupPosition.left + 'px',
                    display: 'block',
                    maxHeight: maxHeight
                });

                var header = $element.find('.popover-title');
                var content = $element.find('.popover-content');
                var footer = $element.find('.popover-footer');
                content.css({
                    // Need to figure out where this 4 comes from.
                    maxHeight: maxHeight - footer.outerHeight() - header.outerHeight() - 4,
                    overflow: 'auto'
                });

                if (arrowPosition) {
                    arrow.css(arrowPosition);
                }

                $element.removeClass('hide');

                $parse(options.popupShown)(scope);
            }

            function makePopup(anchor, scope, options) {
                var element = $compile(template)(scope);
                openedPopup = {
                    el: element,
                    options: options,
                    scope: scope
                };

                var body = $document.find('body');
                body.append(element);

                // Add arrow
                var arrow = $('<div />', {
                    'class': 'arrow'
                });
                element.children('.arrow').remove();
                element.append(arrow);

                scope.$reposition = function () {
                    $timeout(function () {
                        fixPosition(scope, anchor, element, arrow, options);
                    });
                };

                scope.$on('popover-close-all', function () {
                    hidePopup();
                });
            }

            return {
                show: showPopup,
                close: hidePopup
            };
        }
    ])

    .directive('popupShow', [
        'Popup', '$parse', '$timeout',
        function (Popup, $parse, $timeout) {
            return {
                restrict: 'A',
                scope: true,
                link: function (scope, element, attrs) {
                    var $element = $(element);
                    $element.click(function () {
                        $timeout(function () {
                            Popup.close();

                            var shouldShow = $parse(attrs.popupIf || 'true');
                            if (shouldShow(scope)) {
                                Popup.show($element, scope, attrs);
                            }
                        });
                    });
                }
            };
        }
    ])

    .directive('popupAutoShow', [
        'Popup', '$parse',
        function (Popup, $parse) {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    var $element = $(element);
                    scope.$watch(attrs.popupAutoShow, function (val) {
                        if (val) {
                            Popup.close();
                            var shouldShow = $parse(attrs.popupIf || 'true');
                            if (shouldShow(scope)) {
                                Popup.show($element, scope, attrs);
                            }
                        }
                    });
                }
            };
        }
    ]);
