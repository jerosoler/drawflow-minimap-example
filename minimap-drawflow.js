class DrawflowMinimap {
  constructor(container, editor, zoom) {
    this.container = container;
    this.editor = editor;
    this.zoom = zoom;

    this.nodeId = null;

    class DrawflowClone extends Drawflow {
      position(e) {
        if (e.type === "touchmove") {
          var e_pos_x = e.touches[0].clientX;
          var e_pos_y = e.touches[0].clientY;
        } else {
          var e_pos_x = e.clientX;
          var e_pos_y = e.clientY;
        }

        if (this.editor_selected) {
          const x = this.canvas_x + (this.pos_x - e_pos_x);
          const y = this.canvas_y + (this.pos_y - e_pos_y);

          this.precanvas.style.transform =
            "translate(" + x + "px, " + y + "px) scale(" + this.zoom + ")";
          this.dispatch("translate", { x: x, y: y });
        }
        if (e.type === "touchmove") {
          this.mouse_x = e_pos_x;
          this.mouse_y = e_pos_y;
        }
        this.dispatch("mouseMove", { x: e_pos_x, y: e_pos_y });
      }

      dragEnd(e) {
        if (e.type === "touchend") {
          var e_pos_x = this.mouse_x;
          var e_pos_y = this.mouse_y;
        } else {
          var e_pos_x = e.clientX;
          var e_pos_y = e.clientY;
        }
        if (true) {
          this.canvas_x = this.canvas_x + (this.pos_x - e_pos_x);
          this.canvas_y = this.canvas_y + (this.pos_y - e_pos_y);
          this.editor_selected = false;
        }

        this.drag = false;
        this.drag_point = false;
        this.connection = false;
        this.ele_selected = null;
        this.editor_selected = false;
      }
    }

    this.minimap = new DrawflowClone(this.container);
    this.minimap.zoom_min = this.zoom;
    this.minimap.zoom_max = this.zoom;
    this.minimap.zoom = this.zoom;
    this.minimap.zoom_value = this.zoom;
    this.minimap.zoom_last_value = this.zoom;
    this.minimap.editor_mode = "fixed";
    //this.minimap.reroute = true;
    //this.minimap.reroute_fix_curvature = true;

    this.minimap.start();

    this.positionStart();

    this.mask = document.createElement("div");
    this.mask.classList.add("mask");
    this.updateMask();
    this.container.appendChild(this.mask);

    this.offset = this.editor.zoom - this.minimap;

    this.editor.on("import", () => {
      const data = this.editor.export();
      this.minimap.import(data);
      this.positionStart();
      this.updateMask();
    });

    this.editor.on("moduleCreated", (name) => {
      this.minimap.addModule(name);
    });

    this.editor.on("moduleChanged", (name) => {
      this.minimap.changeModule(name);
      this.minimap.zoom = this.zoom;
      this.minimap.zoom_value = this.zoom;
      this.minimap.zoom_last_value = this.zoom;
      this.minimap.zoom_refresh();
    });

    this.minimap.on("moduleChanged", () => {
      this.updateMask();
    });

    this.editor.on("moduleRemoved", (name) => {
      this.minimap.removeModule(name);
    });

    this.editor.on("nodeCreated", (id) => {
      const data = {};
      const node = this.editor.getNodeFromId(id);

      this.minimap.addNode(
        node.name,
        Object.keys(node.inputs).length,
        Object.keys(node.outputs).length,
        node.pos_x,
        node.pos_y,
        node.class,
        data,
        node.html
      );
    });

    this.editor.on("nodeMoved", (id) => {
      const node = this.editor.getNodeFromId(id);
      this.container.querySelector(`#node-${id}`).style.top = `${node.pos_y}px`;
      this.container.querySelector(
        `#node-${id}`
      ).style.left = `${node.pos_x}px`;

      this.minimap.updateNodeDataFromId(id, node);
      this.minimap.updateConnectionNodes(`node-${id}`);
    });

    this.editor.on("mouseMove", (pos) => {
      if (this.nodeId != null && this.editor.drag) {
        const ele = this.container.querySelector(`#node-${this.nodeId}`);
        const node = this.editor.getNodeFromId(this.nodeId);
        ele.style.left = `${node.pos_x}px`;
        ele.style.top = `${node.pos_y}px`;
        this.minimap.updateConnectionNodes(`node-${this.nodeId}`);
      }
    });

    this.editor.on("nodeRemoved", (id) => {
      this.minimap.removeNodeId(`node-${id}`);
    });

    this.editor.on("nodeSelected", (id) => {
      this.nodeId = id;

      this.container.querySelector(`#node-${id}`).classList.add("selected");
    });

    this.editor.on("nodeUnselected", () => {
      if (this.container.querySelector(`#node-${this.nodeId}`) != null) {
        this.container
          .querySelector(`#node-${this.nodeId}`)
          .classList.remove("selected");
      }
      this.nodeId = null;
    });

    this.editor.on("connectionCreated", (conn) => {
      this.minimap.addConnection(
        conn.output_id,
        conn.input_id,
        conn.output_class,
        conn.input_class
      );
    });

    this.editor.on("connectionRemoved", (conn) => {
      this.minimap.removeSingleConnection(
        conn.output_id,
        conn.input_id,
        conn.output_class,
        conn.input_class
      );
    });

    this.editor.on("translate", (pos) => {
      const editorWidth = this.editor.container.getBoundingClientRect().width;
      const editorHeight = this.editor.container.getBoundingClientRect().height;

      const minimapWidth = this.minimap.container.getBoundingClientRect().width;
      const minimapHeight = this.minimap.container.getBoundingClientRect()
        .height;

      this.minimap.canvas_x =
        (pos.x / this.editor.zoom) * this.zoom -
        ((editorWidth - minimapWidth) * this.zoom) / 2;
      this.minimap.canvas_y =
        (pos.y / this.editor.zoom) * this.zoom -
        ((editorHeight - minimapHeight) * this.zoom) / 2;
      this.minimap.precanvas.style.transform =
        "translate(" +
        this.minimap.canvas_x +
        "px, " +
        this.minimap.canvas_y +
        "px) scale(" +
        this.minimap.zoom +
        ")";

      this.minimap.zoom_refresh();
      this.updateMask();
    });

    this.minimap.on("translate", (pos) => {
      const editorWidth = this.editor.container.getBoundingClientRect().width;
      const editorHeight = this.editor.container.getBoundingClientRect().height;

      const minimapWidth = this.minimap.container.getBoundingClientRect().width;
      const minimapHeight = this.minimap.container.getBoundingClientRect()
        .height;

      this.editor.canvas_x =
        (pos.x / this.zoom) * this.editor.zoom +
        ((editorWidth - minimapWidth) * this.editor.zoom) / 2;
      this.editor.canvas_y =
        (pos.y / this.zoom) * this.editor.zoom +
        ((editorHeight - minimapHeight) * this.editor.zoom) / 2;

      this.editor.precanvas.style.transform =
        "translate(" +
        this.editor.canvas_x +
        "px, " +
        this.editor.canvas_y +
        "px) scale(" +
        this.editor.zoom +
        ")";

      this.editor.zoom_refresh();
      this.updateMask();
    });

    this.editor.on("zoom", () => {
      this.updateMask();
    });

    this.minimap.zoom_in = () => {
      this.minimap.dispatch("zoom_in");
    };
    this.minimap.zoom_out = () => {
      this.minimap.dispatch("zoom_out");
    };

    this.minimap.on("zoom_in", () => {
      this.editor.zoom_in();
    });

    this.minimap.on("zoom_out", () => {
      this.editor.zoom_out();
    });
  }

  positionStart() {
    const editorWidth = this.editor.container.getBoundingClientRect().width;
    const editorHeight = this.editor.container.getBoundingClientRect().height;

    const minimapWidth = this.minimap.container.getBoundingClientRect().width;
    const minimapHeight = this.minimap.container.getBoundingClientRect().height;

    this.minimap.canvas_x = -((editorWidth - minimapWidth) * this.zoom) / 2;
    this.minimap.canvas_y = -((editorHeight - minimapHeight) * this.zoom) / 2;
    this.minimap.precanvas.style.transform =
      "translate(" +
      this.minimap.canvas_x +
      "px, " +
      this.minimap.canvas_y +
      "px) scale(" +
      this.minimap.zoom +
      ")";
    this.minimap.zoom_refresh();
  }

  updateMask() {
    const editorWidth = this.editor.container.getBoundingClientRect().width;
    const editorHeight = this.editor.container.getBoundingClientRect().height;
    const minimapWidth = this.minimap.container.getBoundingClientRect().width;
    const minimapHeight = this.minimap.container.getBoundingClientRect().height;

    this.mask.style.width = `${
      ((editorWidth - minimapWidth) / this.editor.zoom) * this.zoom
    }px`;
    this.mask.style.height = `${
      ((editorHeight - minimapHeight) / this.editor.zoom) * this.zoom
    }px`;
    this.mask.style.transform = `scale(${
      editorWidth / (editorWidth - minimapWidth)
    })`;

    this.mask.style.left = `${
      (minimapWidth -
        ((editorWidth - minimapWidth) / this.editor.zoom) * this.zoom) /
      2
    }px`;
    this.mask.style.top = `${
      (minimapHeight -
        ((editorHeight - minimapHeight) / this.editor.zoom) * this.zoom) /
      2
    }px`;
  }
}
