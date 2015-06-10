import EsbConfig from './esb-config';
import EsbUtil from './esb-util';
import EsbPage from './esb-page';

export class EsbPageFramer {
	constructor(opts) {
		var self = this;

		self.iframe_src = null;
		self.placeholder_element = null;
		self.viewer_element = null;
		self.iframe_element = null;
		self.iframe_is_loaded = false;
		self.options = null;
		self.scrollable_ancestors = [];
	    self.logger = EsbUtil.logger;
		self.original_element = opts.viewer_element;
		self.original_snippet = opts.original_snippet;
		self.uuid = opts.uuid;
		self.config = EsbConfig.getConfig();
		self.set_iframe_src();
		self.set_viewer_options();

		self.create_placeholder_element();
	}

	is_iframe_loaded() {
		var self = this;
		return self.iframe_is_loaded;
	}

	set_viewer_options() {
		var self = this,
			options = {
				'load-immediately': false,
				'unload-when-not-visible': false,
				'title': false,
				'caption': false,
				'dimensions': true,
				'href': self.iframe_src,
				'scrolling': 'no',
				'overlay': true,
				'scale': false,
				'viewport-width': 1000,
				'viewport-aspect-ratio': 1.5,
				'width': 200,
				'height': false
			},
			option = null,
			el = self.original_element,
			page_level_config_element = false,
			config_json_global_options = self.config.get('page-framers');

		// Global config
		if (config_json_global_options !== undefined) {
			for (option in options) {
				if (config_json_global_options.get(option) !== undefined) {
					options[option] = EsbUtil.booleanXorValue(config_json_global_options.get(option));
				}
			}
		}

		// Page level config
		while (el.parentNode) {
			el = el.parentNode;
			if (el.tagName !== undefined && el.getAttribute('data-esb-page-framer-config') !== null) {
				page_level_config_element = el;
				break;
			}
		}

		if (page_level_config_element) {
			for (option in options) {
				if (page_level_config_element.getAttribute('data-esb-' + option) !== null) {
					options[option] = EsbUtil.booleanXorValue(page_level_config_element.getAttribute('data-esb-' + option));
				}
			}
		}


		// Viewer level config
		for (option in options) {
			if (self.original_element.getAttribute('data-esb-' + option) !== null) {
				options[option] = EsbUtil.booleanXorValue(self.original_element.getAttribute('data-esb-' + option));
			}
		}

		self.options = options;
	}

	get_placeholder_element_styles() {
		var self = this,
			styles = '',
			width = self.options.width;

		if (self.options.scale) {
			width = self.options['viewport-width'] * self.options.scale;
		}

		styles = 'width:' + width + 'px; ';

		return styles;
	}

	create_placeholder_element() {
		var self = this,
			styles = self.get_placeholder_element_styles();

		self.placeholder_element = '<div class="esb-page-framer ';
		if (self.options.overlay) { self.placeholder_element += ' esb-page-framer-has-overlay '; }
		self.placeholder_element += '" '; 
		if (styles.length > 0) { self.placeholder_element += ' style="' + styles + '" '; }
		self.placeholder_element +='data-esb-uuid="' + self.uuid + '">';
		if (self.options.href) { self.placeholder_element += '<a class="esb-page-framer-link" href="' + self.options.href + '">'; }
		self.placeholder_element += self.get_title();
		self.placeholder_element += self.get_caption();
		self.placeholder_element += self.get_dimensions_annotation();
		self.placeholder_element += self.get_iframe_wrap();
		if (self.options.href) { self.placeholder_element += '</a>'; }
		self.placeholder_element += '</div>';
	}

	get_title() {
		var self = this,
			title = '';
		if (self.options.title) {
			title = '<h3 class="esb-page-framer-title">' + self.options.title + '</h3>';
		}

		return title;
	}

	get_caption() {
		var self = this,
			caption = '';
		if (self.options.caption) {
			caption = '<p class="esb-page-framer-caption">' + self.options.caption + '</p>';
		}

		return caption;
	}

	get_dimensions_annotation() {
		var self = this,
			dimensions = self.get_iframe_dimensions(),
			dimensions_annotation = '';
		
		if (self.options.dimensions && dimensions.width && dimensions.height && dimensions.scale) {
			dimensions_annotation = '<p class="esb-page-framer-dimensions-annotation">';
			dimensions_annotation += Math.round(dimensions.width) + '&times;' + Math.round(dimensions.height) + 'px @ ' + parseFloat((dimensions.scale*100).toFixed(1)) + '% scale';
			dimensions_annotation += '</p>';
		}

		return dimensions_annotation;
	}

	get_iframe_wrap_styles() {
		var self = this,
			styles = '',
			height,
			width = self.options.width;

		if (self.options['viewport-aspect-ratio'] && self.options.width) {
			if (self.options.scale) {
				width = self.options['viewport-width'] * self.options.scale;
			}

			if (self.options.height) {
				height = self.options.height;
			}
			else {
				height = width * self.options['viewport-aspect-ratio'];
			}
			styles = 'width:' + width + 'px; height:' + height + 'px;';
		}

		return styles;
	}

	get_iframe_wrap() {
		var self = this,
			iframe_wrap,
			styles = self.get_iframe_wrap_styles();

		iframe_wrap = '<div class="esb-page-framer-iframe-wrap"';
		if (styles.length > 0) { iframe_wrap += ' style="' + styles + '" '; }
		iframe_wrap += '>';
		iframe_wrap += self.get_loading_animation();
		iframe_wrap += self.get_iframe();
		iframe_wrap += '</div>';

		return iframe_wrap;
	}

	get_loading_animation() {
		return '<div class="esb-loading-animation"></div>';
	}

	get_iframe_styles() {
		var self = this,
			styles = '',
			dimensions = self.get_iframe_dimensions();
		

		if (dimensions.width && dimensions.height && dimensions.scale) {
			styles = 'width:' + dimensions.width + 'px; height:' + dimensions.height + 'px; transform: scale(' + dimensions.scale + '); -webkit-transform: scale(' + dimensions.scale + '); ';
		}

		return styles;
	}

	get_iframe_dimensions() {
		var self = this,
		scale = self.options.scale,
		height, 
		width,
		dimensions = {
			'width': null,
			'height': null,
			'scale': null
		};

		if (self.options['viewport-width'] && self.options['viewport-aspect-ratio'] && self.options.width) {
			if (!self.options.scale) {
				scale = self.options.width / self.options['viewport-width'];
			}
			width = self.options['viewport-width'];

			if (self.options.height) {
				height = self.options.height / scale;
			}
			else {
				height = self.options['viewport-aspect-ratio'] * width;
			}

			dimensions.height = height;
			dimensions.width = width;
			dimensions.scale = scale;
		}

		return dimensions;
	}

	get_iframe() {
		var self = this,
			iframe = null,
			styles = self.get_iframe_styles();

		if (self.iframe_src !== null) {
			iframe = '<iframe class="esb-page-framer-iframe" data-src="' + self.iframe_src + '" scrolling="' + self.options.scrolling + '";';
			if (styles.length > 0) { iframe += ' style="' + styles + '" '; }
			iframe +='></iframe>';
		}
		else {
			self.logger('error', 'EsbPageFramer cannot create placeholder iframe because no iframe src is set.');
		}

		return iframe;
	}

	set_event_listeners() {
		var self = this;

		document.addEventListener('load-esb-page-framer-' + self.uuid, self.load_iframe.bind(self));
		document.addEventListener('unload-esb-page-framer-' + self.uuid, self.unload_iframe.bind(self));

		if (window.$ !== undefined) {
			// jQuery's event system is separate from the browser's, so set these up so $(document).trigger will work
			window.$(document).on('load-esb-page-framer-' + self.uuid, self.load_iframe.bind(self));
			window.$(document).on('unload-esb-page-framer-' + self.uuid, self.unload_iframe.bind(self));
		}
	}

	inject_placeholder() {
		var self = this;
		self.original_element.outerHTML = self.placeholder_element;
		self.viewer_element = document.querySelector('*[data-esb-uuid="' + self.uuid + '"]');
		self.iframe_element = self.viewer_element.querySelector('iframe');
		self.set_scrollable_ancestors();
		self.set_event_listeners();
		self.set_iframe_onload_behavior();

		if (self.options['load-immediately'] === true) {
			self.load_iframe();
		}
		else {
			EsbPage.blocksDone().then(
				function(){
					self.load_iframe_if_visible();
				},
				function() {
					self.logger('error', 'EsbPageFramer ' + self.uuid + ' could not be loaded because Blocks Done did not fire within the Blocks Done Timeout Threshold of: ' + EsbPage.getBlocksDoneTimeout() + 'ms');
				}
			);
		}
	}

	set_state(state) {
		var self = this;
		self.viewer_element.classList.add('esb-page-framer--is-' + state);
	}

	set_scrollable_ancestors() {
		var self = this,
		ancestors = [],
		el = self.viewer_element;

		while (el.parentNode) {
			el = el.parentNode;
			if (el.scrollHeight > el.offsetHeight) {
				if (el.nodeName === 'BODY' || el.nodeName === 'HTML') {
					el = window;
				}
			  ancestors.push(el);
			}
		}

		if (ancestors.length === 0) {
			ancestors.push(document);
		}

		self.scrollable_ancestors = ancestors;
		self.monitor_scrollable_ancestors();
	}

	debounce_scroll_event() {
		var self = this,
		allow_scroll = true;
		if (allow_scroll) {
			allow_scroll = false;
			if (!self.is_iframe_loaded()) {
				self.load_iframe_if_visible();
			}
			else if (self.options['unload-when-not-visible']){
				self.unload_iframe_if_not_visible();
			}
			setTimeout(function() { allow_scroll = true; self.load_iframe_if_visible(); }, 2000);
		}
	}

	debounce_resize_event() {
		var self = this,
		allow_resize = true;
		if (allow_resize) {
			allow_resize = false;
			if (!self.is_iframe_loaded()) {
				self.load_iframe_if_visible();
			}
			else if (self.options['unload-when-not-visible']){
				self.unload_iframe_if_not_visible();
			}
			setTimeout(function() { allow_resize = true; self.load_iframe_if_visible(); }, 2000);
		}
	}

	monitor_scrollable_ancestors() {
		var self = this;

		Array.prototype.forEach.call(self.scrollable_ancestors, function(el){
			el.addEventListener('scroll', self.debounce_scroll_event.bind(self));
			el.addEventListener('resize', self.debounce_resize_event.bind(self));
		});
	}

	set_iframe_onload_behavior() {
		var self = this;

		self.iframe_element.onload = function(){
			self.set_state('loaded');
			self.iframe_is_loaded = true;
			if (!self.options['unload-when-not-visible']) {
				self.stop_monitoring_scrollable_ancestors();
			}
		};
	}

	stop_monitoring_scrollable_ancestors() {
		var self = this;

		Array.prototype.forEach.call(self.scrollable_ancestors, function(el){
			el.removeEventListener('scroll', self.debounce_scroll_event.bind(self));
			el.removeEventListener('resize', self.debounce_resize_event.bind(self));
		});
	}

	load_iframe() {
		var self = this;

		if (self.iframe_element.getAttribute('src') === null) {
			self.set_state('loading');
			self.iframe_element.setAttribute('src', self.iframe_element.getAttribute('data-src'));
		}
	}

	unload_iframe() {
		var self = this;
		self.iframe_element.outerHTML = self.get_iframe();
		self.iframe_element = self.viewer_element.querySelector('iframe');
		self.set_iframe_onload_behavior();
		self.iframe_is_loaded = false;
	}

	unload_iframe_if_not_visible() {
		var self = this;

		if (!self.is_visible()) {
			self.unload_iframe();
		}
	}

	set_iframe_src() {
		var self = this,
			src = null;

		src = self.original_element.getAttribute('data-esb-page-framer');

		if (src.indexOf('http') === 0) {
			self.logger('info', 'Fully qualified url found for page viewer: ' + src + ', esb-page-framer uuid: ' + self.uuid);
		}
		else {
			src = self.get_path_to_src() + src;
		}

		self.iframe_src = src;
	}

	get_path_to_src() {
		var self = this,
			path = null;

		path = self.original_element.getAttribute('data-esb-source');

		if (path === null) {
			if (self.config.get('page-framers') !== undefined && self.config.get('page-framers').get('source') !== undefined) {
				path = self.config.get('page-framers').get('source');
			}
			else {
				path = '';
			}
		}

		if (path.length > 0 && path.slice(-1) !== '/') {
			path += '/';
		}

		return path;
	}

	load_iframe_if_visible() {
		var self = this;

		if (self.is_visible()) {
			self.load_iframe();
		}
	}

	is_visible() {
		var self = this,
			visible = true,
			ancestors = self.scrollable_ancestors.slice(0),
			shortest_ancestor_height = null,
			shortest_ancestor_top = null,
			shortest_ancestor_bottom = null,
			bounding_rect = self.viewer_element.getBoundingClientRect(),
			top_visible_threshold = bounding_rect.top,
			bottom_visible_threshold = bounding_rect.bottom,
			ancestor_height,
			ancestor_bottom,
			ancestor_top;
		
		if (self.viewer_element.offsetParent === null) {
			visible = false;
		}
		else {
			Array.prototype.forEach.call(ancestors, function(el, i){
				if (ancestors[i+1] !== undefined) {
					ancestor_height = ancestors[i].getBoundingClientRect().height;
					ancestor_bottom = ancestors[i].getBoundingClientRect().bottom;
					ancestor_top = ancestors[i].getBoundingClientRect().top;
				}
				else {
					ancestor_height = window.innerHeight;
					ancestor_top = 0;
					ancestor_bottom = ancestor_height;
				}

				if (shortest_ancestor_height === null || shortest_ancestor_height > ancestor_height) {
					shortest_ancestor_height = ancestor_height;
					shortest_ancestor_top = ancestor_top;
					shortest_ancestor_bottom = ancestor_bottom;
				}
			});

			if (shortest_ancestor_height !== null && (
				top_visible_threshold >= (shortest_ancestor_height + shortest_ancestor_top) ||
				bottom_visible_threshold <= (shortest_ancestor_top)
				)) {
				visible = false;
			}
		}

		return visible;
	}
}