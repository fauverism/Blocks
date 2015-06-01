import EsbConfig from 'src/esb-config';
import EsbUtil from 'src/esb-util';
import EsbPage from 'src/esb-page';
import { EsbPageViewer } from 'src/esb-page-viewer';

function load_page_viewer(fixture, uuid) {
	var page_viewer, page_viewer_snippet;

	uuid = typeof uuid === undefined ? EsbUtil.generateUUID() : uuid;

	loadFixtures(fixture);
	page_viewer_snippet = $("#jasmine-fixtures")[0].querySelectorAll('*[data-esb-page-viewer]')[0];
	page_viewer_snippet.setAttribute('data-esb-uuid', uuid);

	page_viewer = new EsbPageViewer({
		viewer_element: page_viewer_snippet,
        original_snippet: page_viewer_snippet.outerHTML,
        uuid: uuid
	});	

	return page_viewer;
}

beforeAll(function(done){
	jasmine.getFixtures().fixturesPath = 'base/spec/fixtures';
	EsbConfig.load('base/spec/fixtures/esb-test-config.json').then(function(data){
		done();
	}, function(err){
		console.log(err);
	});
})

describe("EsbPageViewer", function(){
	var page_viewer = null,
		page_viewer_snippet = null,
		uuid = null;

	beforeEach(function(){
		uuid = EsbUtil.generateUUID();
		page_viewer = load_page_viewer('page-with-page-viewer.html', uuid);
	});


	it("should have a uuid", function(){
		expect(page_viewer.uuid).toEqual(uuid);
	});

	it("should have default options", function(){
		expect(page_viewer.options).toEqual({"load-immediately": false});
	});

	it("should have access to BlocksConfig", function(){
		expect(page_viewer.config.get("page-viewers").get("source")).toEqual('base/spec/fixtures/page-viewers');
	});

	describe("with option overrides", function(){
		beforeEach(function(){
			page_viewer = load_page_viewer('page-viewer-with-option-overrides.html');
		});
	
		it("should override the default options", function(){
			expect(page_viewer.options).toEqual({"load-immediately": true});
		});

		it("should load immediately", function(){
			spyOn(page_viewer, 'load_iframe');
			page_viewer.inject_placeholder();
			expect(page_viewer.load_iframe).toHaveBeenCalled();
		});
	});

	describe("for a fully qualified URL", function(){
		beforeEach(function(){
			page_viewer = load_page_viewer('page-viewer-fully-qualified-url.html');
		});

		it("should use the URL as-is", function(){
			expect(page_viewer.iframe_src).toEqual('http://google.com');
		});

		it("should create a placeholder iframe", function(){
			expect(page_viewer.placeholder_element).toMatch(/<iframe data-src="http:\/\/google.com"><\/iframe>/);
		});

		it("should replace the original snippet with the placeholder iframe", function(){
			page_viewer.inject_placeholder();
		    expect($('#jasmine-fixtures iframe[data-src="http://google.com"]')).toBeInDOM();
		});
	});

// TODO: describe("when data-source is not defined in config.json")

	describe("with a data-source attribute", function(){
		beforeEach(function(){
			page_viewer = load_page_viewer('page-viewer-with-data-source-attribute.html');
		});

		it("should create the iframe_src using the data-source attribute plus the file name", function(){
			expect(page_viewer.iframe_src).toEqual('some/made-up/path/example.html');
		});

		it("should create a placeholder iframe", function(){
			expect(page_viewer.placeholder_element).toMatch(/<iframe data-src="some\/made-up\/path\/example.html"><\/iframe>/);
		});

		it("should replace the original snippet with the placeholder iframe", function(){
			page_viewer.inject_placeholder();
		    expect($('#jasmine-fixtures iframe[data-src="some/made-up/path/example.html"]')).toBeInDOM();
		});
	});

	describe("with no data-source attribute visible at the top of the page", function(){
		beforeEach(function(){
			page_viewer = load_page_viewer('page-viewer-with-no-data-source-attribute.html');
		});

		it("should create the iframe_src using the data-source attribute plus the file name", function(){
			expect(page_viewer.iframe_src).toEqual('base/spec/fixtures/page-viewers/just-a-default-example.html');
		});

		it("should create a placeholder iframe", function(){
			expect(page_viewer.placeholder_element).toMatch(/<iframe data-src="base\/spec\/fixtures\/page-viewers\/just-a-default-example.html"><\/iframe>/);
		});

		it("should replace the original snippet with the placeholder iframe", function(){
			page_viewer.inject_placeholder();
		    expect($('#jasmine-fixtures iframe[data-src="base/spec/fixtures/page-viewers/just-a-default-example.html"]')).toBeInDOM();
		});

		it("should be able to load the iframe within the placeholder", function(){
			page_viewer.inject_placeholder();
			page_viewer.load_iframe();
		    expect($('#jasmine-fixtures iframe[src="base/spec/fixtures/page-viewers/just-a-default-example.html"]')).toBeInDOM();
		});

		it("should be visible", function(){
			page_viewer.inject_placeholder();
			expect(page_viewer.is_visible()).toEqual(true);
		});

		it ("should automatically load after BlocksDone has been called", function(){
			spyOn(EsbPage, 'blocksDone').and.returnValue({then: function(){return true;}});
			page_viewer.inject_placeholder();
			expect(EsbPage.blocksDone).toHaveBeenCalled();
		});
	});

	describe("when nested inside a hidden element", function(){
		beforeEach(function(){
			page_viewer = load_page_viewer('page-viewer-hidden.html');
		});

		it ("should know that it is not visible", function(){
			page_viewer.inject_placeholder();
			expect(page_viewer.is_visible()).toEqual(false);
		});

		it ("should know that it is visible when the parent element becomes visible", function(){
			page_viewer.inject_placeholder();
			document.getElementById("hidden-wrapper").style.display = "block";
			expect(page_viewer.is_visible()).toEqual(true);
		});
	});

	describe("when scrolled out of view", function(){
		beforeEach(function(){
			page_viewer = load_page_viewer('page-viewer-scrolled-out-of-view.html');
		});

		it ("should have scrollable ancestors", function(){
			page_viewer.inject_placeholder();
			expect(page_viewer.scrollable_ancestors.length).toEqual(2);
		});

		it ("should know that it is not visible", function(){
			page_viewer.inject_placeholder();
			expect(page_viewer.is_visible()).toEqual(false);
		});

		it ("should automatically load the iFrame when the viewer is scrolled into view", function(){
			spyOn(page_viewer, 'load_iframe');
			page_viewer.inject_placeholder();

			// programatically 'scroll' the wrapper div
			var wrapper = document.getElementById("scrollable-wrapper");
			wrapper.scrollTop = 1;
			var event = document.createEvent('HTMLEvents');
			event.initEvent('scroll', true, false);
			wrapper.dispatchEvent(event);

			expect(page_viewer.load_iframe).toHaveBeenCalled();
		});
	});
});