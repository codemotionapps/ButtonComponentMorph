(function(window, root, factory){
	'use strict';
	var transEndEventNames = {
			'WebkitTransition': 'webkitTransitionEnd',
			'MozTransition': 'transitionend',
			'OTransition': 'oTransitionEnd',
			'msTransition': 'MSTransitionEnd',
			'transition': 'transitionend'
		},
		transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
		support = { transitions : Modernizr.csstransitions };

	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	function UIMorphingButton(el, morphTrigger, morphSection, options) {
		this.el = el;
		this.button = morphTrigger;
		this.contentEl = morphSection;
		this.options = extend( {}, this.options );
		extend( this.options, options );
		this._init();
	}

	UIMorphingButton.prototype.options = {
		closeEl : '',
		onBeforeOpen : function() { return false; },
		onAfterOpen : function() { return false; },
		onBeforeClose : function() { return false; },
		onAfterClose : function() { return false; }
	}

	UIMorphingButton.prototype._init = function(){
		// state
		this.expanded = false;
		// init events
		this._initEvents();
	}

	UIMorphingButton.prototype._initEvents = function(){
		var self = this;
		// open
		this.button.on('click', function(){ self.toggle(); });
		// close
		if(this.options.closeEl !== ''){
			var closeEl = this.options.closeEl;
			if( closeEl ) {
				closeEl.on('click', function(){ self.toggle(); });
			}
		}
	}

	UIMorphingButton.prototype.toggle = function(){
		if(this.isAnimating) return false;
		this.contentEl.css('width', this.button[0].offsetWidth + "px");
		this.contentEl.css('height', this.button[0].offsetHeight + "px");

		// callback
		if(this.expanded){
			this.options.onBeforeClose();
		}else{
			// add class active (solves z-index problem when more than one button is in the page)
			if(!this.options.onBeforeOpen(this.toggle, this)) return false;
			this.el.addClass('active');
		}

		this.isAnimating = true;

		var self = this,
			onEndTransitionFn = function(ev){
				if(ev.target !== this) return false;

				if(support.transitions){
					// open: first opacity then width/height/left/top
					// close: first width/height/left/top then opacity
					if( self.expanded && ev.propertyName !== 'opacity' || !self.expanded && ev.propertyName !== 'width' && ev.propertyName !== 'height' && ev.propertyName !== 'left' && ev.propertyName !== 'top' ) {
						return false;
					}
					self.contentEl.off(transEndEventName, onEndTransitionFn);
				}
				self.isAnimating = false;

				// callback
				if(self.expanded){
					// remove class active (after closing)
					self.el.removeClass('active');
					self.options.onAfterClose();
				}else{
					self.options.onAfterOpen();
				}

				self.expanded = !self.expanded;
			};

		if(support.transitions){
			this.contentEl.on(transEndEventName, onEndTransitionFn);
		}else{
			onEndTransitionFn();
		}

		// set the left and top values of the contentEl (same like the button)
		var buttonPos = this.button[0].getBoundingClientRect();
		// need to reset
		this.contentEl.addClass('no-transition');
		this.contentEl.css('left', 'auto');
		this.contentEl.css('top', 'auto');

		// add/remove class "open" to the button wraper
		setTimeout( function() { 
			self.contentEl.css('left', buttonPos.left + 'px');
			self.contentEl.css('top', buttonPos.top + 'px');

			if( self.expanded ) {
				self.contentEl.removeClass('no-transition');
				self.el.removeClass('open');
			}
			else {
				setTimeout( function() { 
					self.contentEl.removeClass('no-transition');
					self.el.addClass('open'); 
				}, 25 );
			}
		}, 25 );
	}

	// add to global namespace
	window.UIMorphingButton = UIMorphingButton;

	if (typeof module !== 'undefined' && module.exports) {
		// CommonJS
		if (typeof angular === 'undefined') {
			factory(require('angular'));
		} else {
			factory(angular);
		}
		module.exports = 'ngDialog';
	} else if (typeof define === 'function' && define.amd) {
		// AMD
		define(['angular'], factory);
	} else {
		// Global Variables
		factory(root.angular);
	}
})(window, this, function(angular){
	angular.module("ngMorph", [

	]).directive("morph", function(){
		return {
			scope: true,
			controller: function($scope, $element, $attrs){
				var docElem = window.document.documentElement, didScroll, scrollPosition;
				function onBeforeOpen(toggleFn, that){
					if(!$scope.$parent.$parent.$eval($scope.eval)) return false;
					$scope.morph(toggleFn, that);
					noScroll();
					return true;
				}
				
				function onAfterOpen(){
					$scope.$parent.$parent.$eval($scope.evalAfter);
					canScroll();
				}
				
				// trick to prevent scrolling when opening/closing button
				function noScrollFn() {
					window.scrollTo( scrollPosition ? scrollPosition.x : 0, scrollPosition ? scrollPosition.y : 0 );
				}
				
				function noScroll() {
					window.removeEventListener('scroll', scrollHandler);
					window.addEventListener('scroll', noScrollFn);
				}

				function scrollFn() {
					window.addEventListener('scroll', scrollHandler);
				}

				function canScroll() {
					window.removeEventListener('scroll', noScrollFn);
					scrollFn();
				}

				function scrollHandler() {
					if( !didScroll ) {
						didScroll = true;
						setTimeout( function() { scrollPage(); }, 60 );
					}
				};

				function scrollPage() {
					scrollPosition = { x : window.pageXOffset || docElem.scrollLeft, y : window.pageYOffset || docElem.scrollTop };
					didScroll = false;
				};

				scrollFn();
				
				$scope.button = false;
				this.morphDOMReady = function(el, eval, evalAfter, $evalScope){
					if(el !== undefined){
						$scope.morphTrigger = el;
						$scope.eval = eval;
						$scope.evalAfter = evalAfter;
						$scope.$evalScope = $evalScope;
					}
					if($scope.button == false && $scope.morphSection !== undefined && $scope.morphTrigger !== undefined && $scope.morphContainer !== undefined){
						$scope.button = true;
						new window.UIMorphingButton(
							$scope.morphContainer,
							$scope.morphTrigger,
							$scope.morphSection,
							{
								closeEl : $scope.morphClose,
								onBeforeOpen : onBeforeOpen,
								onAfterOpen : onAfterOpen,
								onBeforeClose : noScroll,
								onAfterClose : canScroll
							}
						);
					}
				}
				$scope.morphClose = "";
				$scope.morphContainer = $element;
				this.morphDOMReady();
			}
		};
	}).directive("morphTrigger", function(){
		return {
			scope: {
				morphTrigger: "@",
				morphEval: "@"
			},
			require: "^morph",
			link: function(scope, el, attrs, morphController){
				morphController.morphDOMReady(el, scope.morphTrigger, scope.morphEval, scope);
			}
		};
	}).directive("morphSection", function($window){
		return {
			require: "^morph",
			link: function(scope, el, attrs, morphController){
				scope.morphSection = el;
				morphController.morphDOMReady();
			}
		}
	});
//	.directive("morphCloseButton", function(){
//		return {
//			require: "^morph",
//			link: function(scope, el, attrs, morphController){
//				scope.morphClose = el;
//				morphController.morphDOMReady();
//			}
//		}
//	});
});