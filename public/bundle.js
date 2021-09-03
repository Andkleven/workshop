var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function append_styles(target, style_sheet_id, styles) {
        const append_styles_to = get_root_for_style(target);
        if (!append_styles_to.getElementById(style_sheet_id)) {
            const style = element('style');
            style.id = style_sheet_id;
            style.textContent = styles;
            append_stylesheet(append_styles_to, style);
        }
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* AddToDo.svelte generated by Svelte v3.42.4 */

    function add_css$1(target) {
    	append_styles(target, "svelte-h3fk8n", "button.svelte-h3fk8n{background:#ff3e00;color:white;border:none;margin-bottom:20px;padding:8px 12px;border-radius:2px}input.svelte-h3fk8n{margin:5px 0 20px 0}");
    }

    function create_fragment$1(ctx) {
    	let div5;
    	let h1;
    	let t1;
    	let div0;
    	let t3;
    	let div1;
    	let input;
    	let t4;
    	let div2;
    	let t6;
    	let div3;
    	let textarea;
    	let t7;
    	let div4;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div5 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Gjøremål";
    			t1 = space();
    			div0 = element("div");
    			div0.innerHTML = `<label for="toDo">Gjøremål</label>`;
    			t3 = space();
    			div1 = element("div");
    			input = element("input");
    			t4 = space();
    			div2 = element("div");
    			div2.innerHTML = `<label for="details">Detaljer</label>`;
    			t6 = space();
    			div3 = element("div");
    			textarea = element("textarea");
    			t7 = space();
    			div4 = element("div");
    			button = element("button");
    			button.textContent = "Lagre";
    			attr(input, "class", "svelte-h3fk8n");
    			attr(button, "class", "svelte-h3fk8n");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, h1);
    			append(div5, t1);
    			append(div5, div0);
    			append(div5, t3);
    			append(div5, div1);
    			append(div1, input);
    			set_input_value(input, /*$value*/ ctx[0].title);
    			append(div5, t4);
    			append(div5, div2);
    			append(div5, t6);
    			append(div5, div3);
    			append(div3, textarea);
    			set_input_value(textarea, /*$value*/ ctx[0].detail);
    			append(div5, t7);
    			append(div5, div4);
    			append(div4, button);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[4]),
    					listen(textarea, "input", /*textarea_input_handler*/ ctx[5]),
    					listen(button, "click", prevent_default(/*handleClick*/ ctx[2]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$value*/ 1 && input.value !== /*$value*/ ctx[0].title) {
    				set_input_value(input, /*$value*/ ctx[0].title);
    			}

    			if (dirty & /*$value*/ 1) {
    				set_input_value(textarea, /*$value*/ ctx[0].detail);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $value;
    	var q = window.faunadb.query;

    	var serverClient = new faunadb.Client({
    			secret: "fnAESCbcTmACS_xZJEqITqgsxEcrVjPHqDVxkwk6"
    		});

    	let { toDos } = $$props;
    	const value = writable({});
    	component_subscribe($$self, value, value => $$invalidate(0, $value = value));

    	async function handleClick() {
    		const formData = get_store_value(value);
    		const data = await serverClient.query(q.Create(q.Collection("toDos"), { data: formData }));
    		toDos.push(data);
    		$$invalidate(3, toDos);
    		value.set({});
    	}

    	function input_input_handler() {
    		$value.title = this.value;
    		value.set($value);
    	}

    	function textarea_input_handler() {
    		$value.detail = this.value;
    		value.set($value);
    	}

    	$$self.$$set = $$props => {
    		if ('toDos' in $$props) $$invalidate(3, toDos = $$props.toDos);
    	};

    	return [$value, value, handleClick, toDos, input_input_handler, textarea_input_handler];
    }

    class AddToDo extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { toDos: 3 }, add_css$1);
    	}
    }

    /* App.svelte generated by Svelte v3.42.4 */

    function add_css(target) {
    	append_styles(target, "svelte-iwcjk2", "main.svelte-iwcjk2{font-family:sans-serif;text-align:center}table.svelte-iwcjk2{margin-left:auto;margin-right:auto}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (32:2) {#each toDos as toDo}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*toDo*/ ctx[4].data.title + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*toDo*/ ctx[4].data.detail + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4;

    	return {
    		c() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			td2.innerHTML = `<input type="checkbox"/>`;
    			t4 = space();
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(tr, t1);
    			append(tr, td1);
    			append(td1, t2);
    			append(tr, t3);
    			append(tr, td2);
    			append(tr, t4);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*toDos*/ 1 && t0_value !== (t0_value = /*toDo*/ ctx[4].data.title + "")) set_data(t0, t0_value);
    			if (dirty & /*toDos*/ 1 && t2_value !== (t2_value = /*toDo*/ ctx[4].data.detail + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let main;
    	let addtodo;
    	let updating_toDos;
    	let t;
    	let table;
    	let current;

    	function addtodo_toDos_binding(value) {
    		/*addtodo_toDos_binding*/ ctx[1](value);
    	}

    	let addtodo_props = {};

    	if (/*toDos*/ ctx[0] !== void 0) {
    		addtodo_props.toDos = /*toDos*/ ctx[0];
    	}

    	addtodo = new AddToDo({ props: addtodo_props });
    	binding_callbacks.push(() => bind(addtodo, 'toDos', addtodo_toDos_binding));
    	let each_value = /*toDos*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			main = element("main");
    			create_component(addtodo.$$.fragment);
    			t = space();
    			table = element("table");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(table, "class", "svelte-iwcjk2");
    			attr(main, "class", "svelte-iwcjk2");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(addtodo, main, null);
    			append(main, t);
    			append(main, table);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const addtodo_changes = {};

    			if (!updating_toDos && dirty & /*toDos*/ 1) {
    				updating_toDos = true;
    				addtodo_changes.toDos = /*toDos*/ ctx[0];
    				add_flush_callback(() => updating_toDos = false);
    			}

    			addtodo.$set(addtodo_changes);

    			if (dirty & /*toDos*/ 1) {
    				each_value = /*toDos*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(addtodo.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(addtodo.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(addtodo);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	var q = window.faunadb.query;

    	var serverClient = new faunadb.Client({
    			secret: "fnAESCbcTmACS_xZJEqITqgsxEcrVjPHqDVxkwk6"
    		});

    	let toDos = [];

    	beforeUpdate(async () => {
    		const newToDos = await serverClient.query(q.Map(q.Paginate(q.Documents(q.Collection("toDos"))), q.Lambda(x => q.Get(x))));
    		$$invalidate(0, toDos = newToDos.data);
    	});

    	function addtodo_toDos_binding(value) {
    		toDos = value;
    		$$invalidate(0, toDos);
    	}

    	return [toDos, addtodo_toDos_binding];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
