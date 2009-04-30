/*
Script: Slick.js
	The new, superfast css selector engine. Adds advanced CSS Querying capabilities for targeting elements.

License:
	MIT-style license.
	
Credits:
	XRegExp_escape is from XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
*/

var slick = (function(buffer){
	
	// slick function
	
	var slick = function(context, expression, all){
		if (!all) all = [];
		
		if (expression == null) return all;
		
		if (typeof expression != 'string' && slick.contains(context, expression)){
			all.push(expression);
			return all;
		}
		
		buffer.positions = {};

		var parsed = slick.parse(expression), uniques = {};
		buffer.push = (parsed.length == 1 && parsed[0].length == 1) ? buffer['push()'] : buffer['push(uid)'];

		for (var i = 0; i < parsed.length; i++){
			
			var currentSelector = parsed[i];
			
			for (var j = 0; j < currentSelector.length; j++){
				var currentBit = currentSelector[j], combinator = 'combinator(' + (currentBit.combinator || ' ') + ')';
				var selector = buffer.parseBit(currentBit);
				
				var tag = selector[0], id = selector[1], params = selector[2];
				
				buffer.local = {};
				
				if (j === (currentSelector.length - 1)){
					buffer.uniques = uniques;
					buffer.found = all;
				} else {
					buffer.uniques = {};
					buffer.found = [];
				}
				
				if (j == 0){
					buffer[combinator](context, tag, id, params);
				} else {
					var items = buffer.current;
					for (var m = 0, n = items.length; m < n; m++) buffer[combinator](items[m], tag, id, params);
				}
				
				buffer.current = buffer.found;

			}
		}
		
		return all;
	};
	
	buffer['combinator(~)'] = buffer['combinator(++)'];
	
	buffer.slick = slick;
	
	// slick contains
	
	slick.contains = (document.documentElement.contains) ? function(context, element){
		return (context !== element && context.contains(element));
	} : (document.documentElement.compareDocumentPosition) ? function(context, element){
		return !!(context.compareDocumentPosition(element) & 16);
	} : function(context, element){
		var elements = context.getElementsByTagName(element.tagName);
		for (var i = 0, l = elements.length; i < l; i++){
			if (elements[i] === element) return true;
		}
		return false;
	};
	
	// add pseudo
	
	slick.definePseudo = function(name, fn){
		buffer['pseudo(' + name + ')'] = function(node, argument){
			return fn.call(node, argument);
		};
		return this;
	};
	
	// default getAttribute (override this please)
	
	slick.getAttribute = function(node, name){
		if (name == 'class') return node.className;
		return node.getAttribute(name);
	};
	
	// matcher
	
	slick.match = function(node, selector, buff){
		if (!selector || selector === node) return true;
		if (!buff) (buff = buffer).positions = {};
		var parsed = buff.parseBit(slick.parse(selector)[0][0]);
		return buff['match(selector)'](node, parsed[0], parsed[1], parsed[2]);
	};
	
	slick.uniques = function(nodes, append){
		var uniques = {};
		if (!append) append = [];
		for (var i = 0, l = nodes.length; i < l; i++){
			var node = nodes[i], uid = buffer.uidOf(node);
			if (!uniques[uid]){
				uniques[uid] = true;
				append.push(node);
			}
		}
		return append;
	};
	
	return slick;

})({

	// cache
	
	'cache': {nth: {}},
	
	// combinators
	
	'combinator( )': function(node, tag, id, selector){
		
		if (id){
			var item;
			if (node.getElementById){
				item = node.getElementById(id);
				if (item) this.push(item, tag, null, selector);
				return;
			} else if ((node === document.documentElement) || this.slick.contains(document.documentElement, node)){
				item = document.getElementById(id);
				if (item && this.slick.contains(node, item)) this.push(item, tag, null, selector);
				return;
			}
		}
		
		
		var children = node.getElementsByTagName(tag);
		for (var i = 0, l = children.length; i < l; i++) this.push(children[i], null, id, selector);
	},
	
	'combinator(>)': function(node, tag, id, selector){
		var children = node.getElementsByTagName(tag);
		for (var i = 0, l = children.length; i < l; i++){
			var child = children[i];
			if (child.parentNode === node) this.push(child, null, id, selector);
		}
	},
	
	'combinator(<)': function(node, tag, id, selector){
		while ((node = node.parentNode)){
			if (node != document) this.push(node, tag, id, selector);
		}
	},
	
	'combinator(+)': function(node, tag, id, selector){
		while ((node = node.nextSibling)){
			if (node.nodeType === 1){
				this.push(node, tag, id, selector);
				break;
			}
		}
	},
	
	'combinator(-)': function(node, tag, id, selector){
		while ((node = node.previousSibling)){
			if (node.nodeType === 1){
				this.push(node, tag, id, selector);
				break;
			}
		}
	},
	
	'combinator(^)': function(node, tag, id, selector){
		node = node.firstChild;
		if (node){
			if (node.nodeType === 1) this.push(node, tag, id, selector);
			else this['combinator(+)'](node, tag, id, selector);
		}
	},
	
	'combinator($)': function(node, tag, id, selector){
		node = node.lastChild;
		if (node){
			if (node.nodeType === 1) this.push(node, tag, id, selector);
			else this['combinator(-)'](node, tag, id, selector);
		}
	},
	
	'combinator(++)': function(node, tag, id, selector){
		while ((node = node.nextSibling)){
			if (node.nodeType !== 1) continue;
			var uid = this.uidOf(node);
			if (this.local[uid]) break;
			this.local[uid] = true;
			this.push(node, tag, id, selector);
		}
	},
	
	'combinator(--)': function(node, tag, id, selector){
		while ((node = node.previousSibling)){
			if (node.nodeType !== 1) continue;
			var uid = this.uidOf(node);
			if (this.local[uid]) break;
			this.local[uid] = true;
			this.push(node, tag, id, selector);
		}
	},
	
	'combinator(±)': function(node, tag, id, selector){
		this['combinator(--)'](node, tag, id, selector);
		this['combinator(++)'](node, tag, id, selector);
	},
	
	// pseudos
	
	'pseudo(checked)': function(node){
		return node.checked;
	},

	'pseudo(empty)': function(node){
		return !(node.innerText || node.textContent || '').length;
	},

	'pseudo(not)': function(node, selector){
		return !slick.match(node, selector, this);
	},

	'pseudo(contains)': function(node, text){
		var inner = node.innerText || node.textContent || '';
		return (inner) ? inner.indexOf(text) > -1 : false;
	},

	'pseudo(first-child)': function(node){
		return this['pseudo(index)'](node, 0);
	},

	'pseudo(last-child)': function(node){
		while ((node = node.nextSibling)){
			if (node.nodeType === 1) return false;
		}
		return true;
	},

	'pseudo(only-child)': function(node){
		var prev = node;
		while ((prev = prev.previousSibling)){
			if (prev.nodeType === 1) return false;
		}
		var next = node;
		while ((next = next.nextSibling)){
			if (next.nodeType === 1) return false;
		}
		return true;
	},

	'pseudo(nth-child)': function(node, argument){
		argument = (!argument) ? 'n' : argument;
		var parsed = this.cache.nth[argument] || this.parseNthArgument(argument);
		if (parsed.special != 'n') return this['pseudo(' + parsed.special + ')'](node, argument);
		if (parsed.a === 1 && parsed.b === 0) return true;
		var count = 0, uid = this.uidOf(node);
		if (!this.positions[uid]){
			while ((node = node.previousSibling)){
				if (node.nodeType !== 1) continue;
				count ++;
				var uis = this.uidOf(node);
				var position = this.positions[uis];
				if (position != null){
					count = position + count;
					break;
				}
			}
			this.positions[uid] = count;
		}
		return (this.positions[uid] % parsed.a === parsed.b);
	},

	// custom pseudo selectors

	'pseudo(index)': function(node, index){
		var count = 0;
		while ((node = node.previousSibling)){
			if (node.nodeType === 1 && ++count > index) return false;
		}
		return (count === index);
	},

	'pseudo(even)': function(node, argument){
		return this['pseudo(nth-child)'](node, '2n+1');
	},

	'pseudo(odd)': function(node, argument){
		return this['pseudo(nth-child)'](node, '2n');
	},
	
	// util
	
	uidIndex: 1,
	
	uidOf: (window.ActiveXObject) ? function(node){
		return (node.slickUID || (node.slickUID = [this.uidIndex++]))[0];
	} : function(node){
		return node.slickUID || (node.slickUID = this.uidIndex++);
	},
	
	parseNthArgument: function(argument){
		var parsed = argument.match(/^([+-]?\d*)?([a-z]+)?([+-]?\d*)?$/);
		if (!parsed) return false;
		var inta = parseInt(parsed[1], 10);
		var a = (inta || inta === 0) ? inta : 1;
		var special = parsed[2] || false;
		var b = parseInt(parsed[3], 10) || 0;
		if (a != 0){
			b--;
			while (b < 1) b += a;
			while (b >= a) b -= a;
		} else {
			a = b;
			special = 'index';
		}
		switch (special){
			case 'n': parsed = {a: a, b: b, special: 'n'}; break;
			case 'odd': parsed = {a: 2, b: 0, special: 'n'}; break;
			case 'even': parsed = {a: 2, b: 1, special: 'n'}; break;
			case 'first': parsed = {a: 0, special: 'index'}; break;
			case 'last': parsed = {special: 'last-child'}; break;
			case 'only': parsed = {special: 'only-child'}; break;
			default: parsed = {a: (a - 1), special: 'index'};
		}

		return this.cache.nth[argument] = parsed;
	},
	
	parseBit: function(bit){
		var selector = {
			classes: bit.classes || [],
			attributes: bit.attributes || [],
			pseudos: bit.pseudos || []
		};
		
		for (var i = 0; i < selector.pseudos.length; i++){
			var pseudo = selector.pseudos[i];
			if (!pseudo.newName){
				pseudo.name = 'pseudo(' + pseudo.name + ')';
				pseudo.newName = true;
			}
		};
		
		return [bit.tag || '*', bit.id, selector];
	},
	
	stringContains: function(source, string, separator){
		separator = separator || '';
		return (separator + source + separator).indexOf(separator + string + separator) > -1;
	},
	
	// match
	
	'match(tag)': function(node, tag){
		return (tag === '*' || (node.tagName && node.tagName.toLowerCase() === tag));
	},
	
	'match(id)': function(node, id){
		return ((node.id && node.id === id));
	},
	
	'match(class)': function(node, className){
		return (this.stringContains(node.className, className, ' '));
	},
	
	'match(attribute)': function(node, name, operator, value, regexp){
		var actual = slick.getAttribute(node, name);
		if (!operator) return !!(actual);
		if (operator === '=') return (actual === value);
		if (!actual && (!value || operator === '!=')) return false;
		return regexp.test(actual);
	},
	
	'match(pseudo)': function(node, name, argument){
		if (this[name]){
			return this[name](node, argument);
		} else {
			return this['match(attribute)'](node, name, (argument == null) ? null : '=', argument);
		}
	},
	
	'match(selector)': function(node, tag, id, selector){
		if (tag && !this['match(tag)'](node, tag)) return false;
		if (id && !this['match(id)'](node, id)) return false;

		var i;

		var classes = selector.classes;
		for (i = classes.length; i--; i){
			var className = classes[i];
			if (!node.className || !this['match(class)'](node, className)) return false;
		}

		var attributes = selector.attributes;
		for (i = attributes.length; i--; i){
			var attribute = attributes[i];
			if (!this['match(attribute)'](node, attribute.name, attribute.operator, attribute.value, attribute.regexp)) return false;
		}

		var pseudos = selector.pseudos;
		for (i = pseudos.length; i--; i){
			var pseudo = pseudos[i];
			if (!this['match(pseudo)'](node, pseudo.name, pseudo.argument)) return false;
		}

		return true;
	},
	
	// push
	
	'push()': function(node, tag, id, selector){
		if (this['match(selector)'](node, tag, id, selector)) this.found.push(node);
	},
	
	// push(uid)
	
	'push(uid)': function(node, tag, id, selector){
		var uid = this.uidOf(node);
		if (!this.uniques[uid] && this['match(selector)'](node, tag, id, selector)){
			this.uniques[uid] = true;
			this.found.push(node);
		}
	}

});

/* Subtle Parser */

slick.parse = (function(){
	
	var SubtleSlickParse = function(CSS3Selectors){
		var selector = '' + CSS3Selectors;
		if (cache[selector]) return cache[selector];
		parsedSelectors = [];
		parsedSelectors.type = [];
		
		while (selector != (selector = selector.replace(parseregexp, parser)));

		return cache['' + CSS3Selectors] = parsedSelectors;
	};
	
	var parseregexp = new RegExp("(?x)\
		^(?:\n\
		         \\s+ (?=[<>»«≤≥+~$^±-] | $)     # Meaningless Whitespace \n\
		|      ( ,                 ) \\s* # Separator              \n\
		|      ( \\s     (?=[^<>»«≤≥+~$^±-]))    # CombinatorChildren     \n\
		|      ( [<>»«≤≥+~$^±-]{1,2}      ) \\s* # Combinator             \n\
		|      ( [a-z0-9_-]+ | \\* )      # Tag                    \n\
		| \\#  ( [a-z0-9_-]+       )      # ID                     \n\
		| \\.  ( [a-z0-9_-]+       )      # ClassName              \n\
		| \\[  ( [a-z0-9_-]+       )(?: ([*^$!~|]?=) (?: \"([^\"]*)\" | '([^']*)' | ([^\\]]*) )     )?  \\](?!\\]) # Attribute \n\
		|   :+ ( [a-z0-9_-]+       )(            \\( (?: \"([^\"]*)\" | '([^']*)' | ([^\\)]*) ) \\) )?             # Pseudo    \n\
	)".replace(/\(\?x\)|\s+#.*$|\s+/gim, ''), 'i');
	
	var map = {
		rawMatch : 0,
		offset   : -2,
		string   : -1,
		
		separator  : 1,
		combinator : 2,
		combinatorChildren : 3,
		
		tagName   : 4,
		id        : 5,
		className : 6,
		
		attributeKey         : 7,
		attributeOperator    : 8,
		attributeValueDouble : 9,
		attributeValueSingle : 10,
		attributeValue       : 11,
		
		pseudoClass            : 12,
		pseudoClassArgs        : 13,
		pseudoClassValueDouble : 14,
		pseudoClassValueSingle : 15,
		pseudoClassValue       : 16
	};
	
	var MAP = (function(){
		var obj = {};
		for (var property in map) {
			var value = map[property];
			if (value<1) continue;
			obj[value] = property;
		}
		return obj;
	})();

	var cache = SubtleSlickParse.cache = {};
	
	var parsedSelectors;
	var these_simpleSelectors;
	var this_simpleSelector;

	var XRegExp_escape = function(str){
	    return String(str).replace(/[-[\]{}()*+?.\\^$|,#\s]/g, "\\$&");
	};
	
	var attribValueToRegex = function(operator, value){
		if (!operator) return null;
		var val = XRegExp_escape(value);
		switch(operator){
			case  '=': return new RegExp('^'       + val +  '$'     );
			case '!=': return new RegExp('^(?!'    + val +  '$)'    );
			case '*=': return new RegExp(            val            );
			case '^=': return new RegExp('^'       + val            );
			case '$=': return new RegExp(            val +  '$'     );
			case '~=': return new RegExp('(^|\\s)' + val + '(\\s|$)');
			case '|=': return new RegExp('(^|\\|)' + val + '(\\||$)');
			default  : return null;
		}
	};
	
	var parser = function(){
		var a = arguments;
		var selectorBitMap;
		var selectorBitName;
		
		for (var aN = 1; aN < a.length; aN++){
			if (a[aN]){
				selectorBitMap = aN;
				selectorBitName = MAP[selectorBitMap];
				break;
			}
		}
		
		if (!parsedSelectors.length || a[map.separator]){
			parsedSelectors.push([]);
			these_simpleSelectors = parsedSelectors[parsedSelectors.length-1];
			if (parsedSelectors.length-1) return '';
		}
		
		if (!these_simpleSelectors.length || a[map.combinatorChildren] || a[map.combinator]){
			these_simpleSelectors.push({
				combinator: a[map.combinatorChildren] || a[map.combinator]
			});
			this_simpleSelector = these_simpleSelectors[these_simpleSelectors.length-1];
			parsedSelectors.type.push(this_simpleSelector.combinator);
			if (these_simpleSelectors.length-1) return '';
		}
		
		switch(selectorBitMap){
			
			case map.tagName:
				this_simpleSelector.tag = a[map.tagName];
			break;
			
			case map.id:
				this_simpleSelector.id  = a[map.id];
			break;
			
			case map.className:
				if(!this_simpleSelector.classes)
					this_simpleSelector.classes = [];
				this_simpleSelector.classes.push(a[map.className]);
			break;
			
			case map.attributeKey:
				if(!this_simpleSelector.attributes)
					this_simpleSelector.attributes = [];
				this_simpleSelector.attributes.push({
					name     : a[map.attributeKey],
					operator : a[map.attributeOperator],
					value    : a[map.attributeValue] || a[map.attributeValueDouble] || a[map.attributeValueSingle],
					regexp   : attribValueToRegex(a[map.attributeOperator], a[map.attributeValue] || a[map.attributeValueDouble] || a[map.attributeValueSingle] || '')
				});
			break;
			
			case map.pseudoClass:
				if(!this_simpleSelector.pseudos)
					this_simpleSelector.pseudos = [];
				var pseudoClassValue = a[map.pseudoClassValue] || a[map.pseudoClassValueDouble] || a[map.pseudoClassValueSingle];
				if (pseudoClassValue == 'odd') pseudoClassValue = '2n+1';
				else if (pseudoClassValue == 'even') pseudoClassValue = '2n';
			
				pseudoClassValue = pseudoClassValue || (a[map.pseudoClassArgs] ? "" : null);
			
				this_simpleSelector.pseudos.push({
					name     : a[map.pseudoClass],
					argument : pseudoClassValue
				});
			break;
		}
		
		parsedSelectors.type.push(selectorBitName + (a[map.attributeOperator] || ''));
		return '';
	};
	
	return SubtleSlickParse;

})();
