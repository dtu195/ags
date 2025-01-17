import Gtk from 'gi://Gtk?version=3.0';
import { typecheck, error, warning, interval } from './utils.js';
import * as Basic from './widgets.js';

interface ServiceAPI {
    instance: {
        connectWidget: (widget: Gtk.Widget, callback: (widget: Gtk.Widget, ...args: any[]) => void, event?: string) => void
    }
}

interface Widget {
    type: string | (() => Gtk.Widget)
    className?: string
    style?: string
    halign?: 'start' | 'center' | 'end' | 'fill'
    valign?: 'start' | 'center' | 'end' | 'fill'
    hexpand?: boolean
    vexpand?: boolean
    sensitive?: boolean
    tooltip?: string
    visible?: boolean
    connections?: ([string, (...args: any[]) => any] | [number, (...args: any[]) => any] | [ServiceAPI, (...args: any[]) => any, string])[]
    properties?: [any, any][]
    setup?: (widget: Gtk.Widget) => void
}

const widgets: { [key: string]: (props: any) => Gtk.Widget } = {
    'box': Basic.Box,
    'button': Basic.Button,
    'centerbox': Basic.CenterBox,
    'dynamic': Basic.Dynamic,
    'entry': Basic.Entry,
    'eventbox': Basic.EventBox,
    'icon': Basic.Icon,
    'label': Basic.Label,
    'overlay': Basic.Overlay,
    'progressbar': Basic.ProgressBar,
    'revealer': Basic.Revealer,
    'scrollable': Basic.Scrollable,
    'slider': Basic.Slider,
    'stack': Basic.Stack,
    'switch': Basic.Switch,
};

export function setStyle(widget: Gtk.Widget, css: string) {
    const provider = new Gtk.CssProvider();
    const style = `* { ${css} }`;
    provider.load_from_data(style);
    widget.get_style_context().add_provider(provider, Gtk.STYLE_PROVIDER_PRIORITY_USER);
}

export function toggleClassName(widget: Gtk.Widget, className: string, condition = true) {
    condition
        ? widget.get_style_context().add_class(className)
        : widget.get_style_context().remove_class(className);
}

function parseParams(widget: Gtk.Widget, {
    type, className, style, sensitive, tooltip, connections, properties, setup,
    halign, valign, hexpand, vexpand, visible = true,
}: Widget) {
    type = type.toString();
    typecheck('className', className, ['string', 'undefined'], type);
    typecheck('style', style, ['string', 'undefined'], type);
    typecheck('sensitive', sensitive, ['boolean', 'undefined'], type);
    typecheck('tooltip', tooltip, ['string', 'undefined'], type);
    typecheck('halign', halign, ['string', 'undefined'], type);
    typecheck('valign', valign, ['string', 'undefined'], type);
    typecheck('hexpand', hexpand, ['boolean', 'undefined'], type);
    typecheck('vexpand', vexpand, ['boolean', 'undefined'], type);
    typecheck('visible', visible, 'boolean', type);

    // @ts-ignore
    widget.setStyle = (css: string) => setStyle(widget, css);

    // @ts-ignore
    widget.toggleClassName = (className: string, condition = true) => toggleClassName(widget, className, condition);

    if (typeof className === 'string') {
        className.split(' ').forEach(cn => {
            widget.get_style_context().add_class(cn);
        });
    }

    if (typeof halign === 'string') {
        try {
            // @ts-ignore
            widget.halign = Gtk.Align[halign.toUpperCase()];
        } catch (err) {
            warning('wrong halign value');
        }
    }

    if (typeof valign === 'string') {
        try {
            // @ts-ignore
            widget.valign = Gtk.Align[valign.toUpperCase()];
        } catch (err) {
            warning('wrong valign value');
        }
    }

    if (typeof hexpand === 'boolean')
        widget.hexpand = hexpand;

    if (typeof vexpand === 'boolean')
        widget.vexpand = vexpand;

    if (typeof sensitive === 'boolean')
        widget.sensitive = sensitive;

    if (typeof tooltip === 'string')
        widget.set_tooltip_text(tooltip);

    if (typeof style === 'string')
        setStyle(widget, style);

    if (typeof visible === 'boolean')
        widget.visible = visible;

    if (properties) {
        properties.forEach(([key, value]) => {
            // @ts-ignore
            widget[`_${key}`] = value;
        });
    }

    if (connections) {
        connections.forEach(([s, callback, event]) => {
            if (typeof s === 'string')
                widget.connect(s, callback);

            else if (typeof s === 'number')
                interval(s, () => callback(widget), widget);

            else
                s.instance.connectWidget(widget, callback, event);
        });
    }

    if (typeof setup === 'function')
        setup(widget);
}

export default function Widget(params: Widget | string | (() => Gtk.Widget) | Gtk.Widget): Gtk.Widget {
    if (!params) {
        error('Widget from null/undefined');
        return new Gtk.Label({ label: `error widget from: "${params}"` });
    }

    if (typeof params === 'string')
        return new Gtk.Label({ label: params });

    if (typeof params === 'function')
        return params();

    if (params instanceof Gtk.Widget)
        return params;

    const {
        type, className, style, halign, valign, connections, properties,
        hexpand, vexpand, sensitive, tooltip, visible, setup,
        ...props
    }: Widget = params;

    let widget: Gtk.Widget | null = null;
    if (typeof type === 'function')
        widget = type();

    if (typeof type === 'string' && type in widgets)
        widget = widgets[type]({ type, ...props });

    if (widget === null) {
        error(`There is no widget with type ${type}`);
        return new Gtk.Label({ label: `${type} doesn't exist` });
    }

    parseParams(widget, {
        type, className, style, halign, valign, connections, properties,
        hexpand, vexpand, sensitive, tooltip, visible, setup,
    });

    return widget;
}

Widget.widgets = widgets;
