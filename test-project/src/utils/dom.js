export const domManipulation = {
  createElement(tag, className = '', textContent = '') {
    if (typeof document === 'undefined') {
      // Mock element for server-side rendering
      return {
        tagName: tag.toUpperCase(),
        className,
        textContent,
        children: [],
        appendChild: function(child) {
          this.children.push(child);
          return child;
        },
        setAttribute: function(name, value) {
          this[name] = value;
        },
        getAttribute: function(name) {
          return this[name];
        }
      };
    }
    
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  },
  
  createComponent(config) {
    const { tag = 'div', className, children = [], attributes = {} } = config;
    const element = this.createElement(tag, className);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    // Add children
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(this.createElement('span', '', child));
      } else if (child && typeof child === 'object') {
        element.appendChild(this.createComponent(child));
      }
    });
    
    return element;
  },
  
  templateEngine: {
    render(template, data) {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || match;
      });
    },
    
    renderList(items, itemTemplate) {
      return items.map(item => this.render(itemTemplate, item)).join('');
    },
    
    compile(template) {
      return (data) => this.render(template, data);
    }
  },
  
  eventSystem: {
    listeners: new Map(),
    
    on(element, event, handler) {
      if (!this.listeners.has(element)) {
        this.listeners.set(element, new Map());
      }
      
      const elementListeners = this.listeners.get(element);
      if (!elementListeners.has(event)) {
        elementListeners.set(event, []);
      }
      
      elementListeners.get(event).push(handler);
      
      if (element && element.addEventListener) {
        element.addEventListener(event, handler);
      }
    },
    
    off(element, event, handler) {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
      
      const elementListeners = this.listeners.get(element);
      if (elementListeners && elementListeners.has(event)) {
        const handlers = elementListeners.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }
};