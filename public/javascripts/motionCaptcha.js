/*!
 * jQuery MotionCAPTCHA v0.2
 * 
 * Proof of concept only for now, check the roadmap to see when it will be ready for wider use!
 * 
 * http://josscrowcroft.com/projects/motioncaptcha-jquery-plugin/
 * 
 * DEMO: http://josscrowcroft.com/demos/motioncaptcha/
 * CODE: https://github.com/josscrowcroft/MotionCAPTCHA
 *
 * Modified by Rogério Chaves to only use server-side validation with NodeJS
 * 
 * Copyright (c) 2011 Joss Crowcroft - joss[at]josscrowcroftcom | http://www.josscrowcroft.com
 * 
 * Incoporates other open source projects, attributed below.
 */
jQuery.fn.motionCaptcha || (function($) {
	
	/**
	 * Main plugin function definition
	 */
	$.fn.motionCaptcha = function(shape, options) {
		
		/**
		 * Act on matched form element:
		 * This could be set up to iterate over multiple elements, but tbh would it ever be useful?
		 */
		return this.each(function() {
				
			// Build main options before element iteration:
			var opts = $.extend({}, $.fn.motionCaptcha.defaults, options);
			
			// Ensure option ID params are valid #selectors:
			opts.actionId = '#' + opts.actionId.replace(/\#/g, '');
			opts.canvasId = '#' + opts.canvasId.replace(/\#/g, '');
			opts.divId = '#' + opts.divId.replace(/\#/g, '');
			opts.submitId = ( opts.submitId ) ? '#' + opts.submitId.replace(/\#/g, '') : false;

			// Plugin setup:

			// Set up Harmony vars:
			var brush;
				
			// Set up MotionCAPTCHA form and jQuery elements:
			var $body = $('body'),
				$form = $(this),
				$container = $(opts.divId),
				$canvas = $(opts.canvasId),
				$submit = $form.find('input[type="submit"]');
			
			// Set up MotionCAPTCHA canvas vars:
			var canvasWidth = $canvas.width(),
				canvasHeight = $canvas.height(),
				borderLeftWidth = 1 * $canvas.css('borderLeftWidth').replace('px', ''),
				borderTopWidth = 1 * $canvas.css('borderTopWidth').replace('px', '');			

			// Canvas setup:
			
			// Set the canvas DOM element's dimensions to match the display width/height (pretty important):
			$canvas[0].width = canvasWidth;
			$canvas[0].height = canvasHeight;
			
			// Get DOM reference to canvas context:
			var ctx = $canvas[0].getContext("2d");
			
			// Add canvasWidth and canvasHeight values to context, for Ribbon brush:
			ctx.canvasWidth = canvasWidth;
			ctx.canvasHeight = canvasHeight;
			
			// Set canvas context font and fillStyle:
			ctx.font = opts.canvasFont;
			ctx.fillStyle = opts.canvasTextColor;
			
			// Get session shape
			$canvas.addClass( shape );
			
			// Set up Dollar Recognizer and drawing vars:
			var _isDown = false,
				_holdStill = false,
				_points = [];

			// Create the Harmony Ribbon brush:
			brush = new Ribbon(ctx);

			// Mousedown event
			// Start Harmony brushstroke and begin recording DR points:
			var touchStartEvent = function(event) {
				
				// Prevent default action:
				event.preventDefault();
				
				// Get mouse position inside the canvas:
				var pos = getPos(event),
					x = pos[0],
					y = pos[1];
				
				// Internal drawing var	
				_isDown = true;
				
				// Prevent jumpy-touch bug on android, no effect on other platforms:
				_holdStill = true;
				
				// Disable text selection:
				$('body').addClass('mc-noselect');
				
				// Clear canvas:
				ctx.clearRect(0, 0, canvasWidth, canvasHeight);
				
				// Start brushstroke:
				brush.strokeStart(x, y);

				// Remove 'mc-invalid' and 'mc-valid' classes from canvas:
				$canvas.removeClass('mc-invalid mc-valid');
				
				// Add the first point to the points array:
				_points = [[x, y]];

				return false;
			}; // mousedown/touchstart event

			// Mousemove event:
			var touchMoveEvent = function(event) {
				if ( _holdStill ) {
					return _holdStill = 0;
				}
				// If mouse is down and canvas not locked:
				if ( _isDown ) {
									
					// Prevent default action:
					event.preventDefault();

					// Get mouse position inside the canvas:
					var pos = getPos(event),
						x = pos[0],
						y = pos[1];
					
					// Append point to points array:
					_points.push([x, y]);
					
					// Do brushstroke:
					brush.stroke(x, y);
				}
				return false;
			}; // mousemove/touchmove event
			
			
			// Mouseup event:
			var touchEndEvent = function(event) {
				// If mouse is down and canvas not locked:
				if ( _isDown ) {
					_isDown = false;
					
					// Allow text-selection again:
					$('body').removeClass('mc-noselect');
					
					// Dollar Recognizer result:
					if (_points.length >= 10) {

						// Get the hidden field which will contain the points to submit with the form
						var hidden_points = $form.find('input[name="_points"]');

						// Stringfy the points
						var str_points = [];
						for(p in _points) str_points.push(_points[p].join(','));
						str_points = str_points.join('|');
						
						// Create the hidden input if not exists
						if(hidden_points.length == 0){
							$form.append($('<input>').attr({name: '_points', type:'hidden', value: str_points}));
						}else{
							// If exists just change the value
							hidden_points.val(str_points);
						}
						// Enable form submit
						$submit.removeAttr('disabled');
						
					} else { // fewer than 10 points were recorded:

						// Disable form submit, just to help the user now he have to draw first
						$submit.attr('disabled', 'disabled');

					}
				}
				return false;
			}; // mouseup/touchend event

			// Bind events to canvas:
			$canvas.bind({
				mousedown:  touchStartEvent,
				mousemove: touchMoveEvent,
				mouseup:  touchEndEvent,
			});

			// Mobile touch events:
			$canvas[0].addEventListener('touchstart', touchStartEvent, false);
			$canvas[0].addEventListener('touchmove', touchMoveEvent, false);
			$canvas[0].addEventListener('touchend', touchEndEvent, false);

			// Add active CSS class to form:
			$form.addClass(opts.cssClass.replace(/\./, ''))

		
			/**
			 * Get X/Y mouse position, relative to (/inside) the canvas
			 * 
			 * Handles cross-browser quirks rather nicely, I feel.
			 * 
			 * @todo For 1.0, if no way to obtain coordinates, don't activate MotionCAPTCHA.
			 */
			function getPos(event) {
				var x, y;
				
				// Check for mobile first to avoid android jumpy-touch bug (iOS / Android):
				if ( event.touches && event.touches.length > 0 ) {
					// iOS/android uses event.touches, relative to entire page:
					x = event.touches[0].pageX - $canvas.offset().left + borderLeftWidth;
					y = event.touches[0].pageY - $canvas.offset().top + borderTopWidth;
				} else if ( event.offsetX ) {
					// Chrome/Safari give the event offset relative to the target event:
					x = event.offsetX - borderLeftWidth;
					y = event.offsetY - borderTopWidth;
				} else {
					// Otherwise, subtract page click from canvas offset (Firefox uses this):
					x = event.pageX - $canvas.offset().left - borderLeftWidth;
					y = event.pageY - $canvas.offset().top - borderTopWidth;
				}
				return [x,y];
			}

		}); // this.each

	} // end main plugin function
	
	
	/**
	 * Exposed default plugin settings, which can be overridden in plugin call.
	 */
	$.fn.motionCaptcha.defaults = {
		actionId: '#mc-action',     // The ID of the input containing the form action
		divId: '#mc',               // If you use an ID other than '#mc' for the placeholder, pass it in here
		canvasId: '#mc-canvas',     // The ID of the MotionCAPTCHA canvas element
		submitId: false,            // If your form has multiple submit buttons, give the ID of the main one here
		cssClass: '.mc-active',     // This CSS class is applied to the form, when the plugin is active
	
		// An array of shape names that you want MotionCAPTCHA to use:
		shapes: ['triangle', 'x', 'rectangle', 'circle', 'check', 'caret', 'zigzag', 'arrow', 'leftbracket', 'rightbracket', 'v', 'delete', 'star', 'pigtail'],
		
		// Canvas vars:
		canvasFont: '15px "Lucida Grande"',
		canvasTextColor: '#111',
		
		// These messages are displayed inside the canvas after a user finishes drawing:
		errorMsg: 'Please try again.',
		successMsg: 'Captcha passed!',
		
		// This message is displayed if the user's browser doesn't support canvas:
		noCanvasMsg: "Your browser doesn't support <canvas> - try Chrome, FF4, Safari or IE9.",
		
		// This could be any HTML string (eg. '<label>Draw this shit yo:</label>'):
		label: '<p>Please draw the shape in the box to submit the form:</p>',
		
		// Callback function to execute when a user successfully draws the shape
		// Passed in the form, the canvas and the canvas context
		// Scope (this) is active plugin options object (opts)
		// NB: The default onSuccess callback function enables the submit button, and adds the form action attribute:
		onSuccess: function($form, $canvas, ctx) {
			var opts = this,
				$submit = opts.submitId ? $form.find(opts.submitId) : $form.find('input[type=submit]:disabled');
						
			// Set the form action:
			$form.attr( 'action', $(opts.actionId).val() );
			
			// Enable the submit button:
			$submit.prop('disabled', false);
			
			return;
		},
		
		// Callback function to execute when a user successfully draws the shape
		// Passed in the form, the canvas and the canvas context
		// Scope (this) is active plugin options object (opts)
		onError: function($form, $canvas, ctx) {
			var opts = this;
			return;
		}
	};
	

	/*!
	 * Harmony | mrdoob | Ribbon Brush class
	 * http://mrdoob.com/projects/harmony/
	 */
	
	function Ribbon( ctx ) {
		this.init( ctx );
	}
	
	Ribbon.prototype = {
		ctx: null,
		X: null, 
		Y: null,
		painters: null,
		interval: null,
		init: function( ctx ) {
			var scope = this,
				userAgent = navigator.userAgent.toLowerCase(),
				brushSize = ( userAgent.search("android") > -1 || userAgent.search("iphone") > -1 ) ? 2 : 1,
				strokeColor = [0, 0, 0];
			
			this.ctx = ctx;
			this.ctx.globalCompositeOperation = 'source-over';
			
			this.X = this.ctx.canvasWidth / 2;
			this.Y = this.ctx.canvasHeight / 2;
	
			this.painters = [];
			
			// Draw each of the lines:
			for ( var i = 0; i < 38; i++ ) {
				this.painters.push({
					dx: this.ctx.canvasWidth / 2, 
					dy: this.ctx.canvasHeight / 2, 
					ax: 0, 
					ay: 0, 
					div: 0.1, 
					ease: Math.random() * 0.18 + 0.60
				});
			}
			
			// Set the ticker:
			this.interval = setInterval( update, 1000/60 );
			
			function update() {
				var i;
				
				scope.ctx.lineWidth = brushSize;			
				scope.ctx.strokeStyle = "rgba(" + strokeColor[0] + ", " + strokeColor[1] + ", " + strokeColor[2] + ", " + 0.06 + ")";
				
				for ( i = 0; i < scope.painters.length; i++ ) {
					scope.ctx.beginPath();
					scope.ctx.moveTo(scope.painters[i].dx, scope.painters[i].dy);
					
					scope.painters[i].dx -= scope.painters[i].ax = (scope.painters[i].ax + (scope.painters[i].dx - scope.X) * scope.painters[i].div) * scope.painters[i].ease;
					scope.painters[i].dy -= scope.painters[i].ay = (scope.painters[i].ay + (scope.painters[i].dy - scope.Y) * scope.painters[i].div) * scope.painters[i].ease;
					scope.ctx.lineTo(scope.painters[i].dx, scope.painters[i].dy);
					scope.ctx.stroke();
				}
			}
		},
		destroy: function() {
			clearInterval(this.interval);
		},
		strokeStart: function( X, Y ) {
			this.X = X;
			this.Y = Y
	
			for (var i = 0; i < this.painters.length; i++) {
				this.painters[i].dx = X;
				this.painters[i].dy = Y;
			}
	
			this.shouldDraw = true;
		},
		stroke: function( X, Y ) {
			this.X = X;
			this.Y = Y;
		}
	};

})(jQuery);