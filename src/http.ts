import { replaceContent } from "./dom.js";

class HTTPResponse {
    private _resp: Response;
    private _errorHandler?: (err: object) => void;

    constructor(nativeResponse: Response) {
        this._resp = nativeResponse;
    }

    public or(func: (err: object) => void): HTTPResponse {
        this._errorHandler = func;
        return this;
    }

    public async loadInto(id: string): Promise<void> {
        const data = await this.content() ?? "";
        replaceContent(id, data);
    }
    
    private async _readResponseContent(asJSON: boolean): Promise<object | string | null> {
        try {
            if (this._resp.ok) {
                return asJSON ? await this._resp.json() : await this._resp.text();
            } else {
                console.log(this);
                throw Error(`Request failed, got status: ${this._resp.status}`);
            }
        } catch (ex) {
            this._handleException(ex);
        }

        return null;
    }

    public async json(): Promise<object | null> {
        return await this._readResponseContent(true) as object;
    }

    public async content(): Promise<string | null> {
        return await this._readResponseContent(false) as string;
    }

    private _handleException(ex: any) {
        if (this._errorHandler !== undefined) {
            this._errorHandler(ex);
        } else {
            // no custom function defined, rethrow
            throw ex;
        }
    }

}  

export class HTTPClient {

    constructor() {

    }

    public async get(url: string, headers?: object): Promise<HTTPResponse> {
        return this._handleResponse(
            await fetch(
                this._buildRequest(url, 'GET', undefined, headers)
            )
        );
    }

    public async post(url: string, body?: object, headers?: object) {
        return this._handleResponse(
            await fetch(
                this._buildRequest(url, 'GET', body, headers)
            )
        );
    }

    public async put(url: string, body?: object, headers?: object) {
        return this._handleResponse(
            await fetch(
                this._buildRequest(url, 'GET', body, headers)
            )
        );
    }

    public async delete(url: string, headers?: object) {
        return this._handleResponse(
            await fetch(
                this._buildRequest(url, 'GET', undefined, headers)
            )
        );
    }

    _buildRequest(url: string, method: string, body?: object, headers?: object): Request {
        if (body && ['PUT', 'POST'].includes(method)) {
            return new Request(url, {
                method: method,
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    ... headers
                }
            });
        } else {
            return new Request(url, {
                method: method,
                headers: headers as HeadersInit ?? {}
            });
        }
    }

    private _handleResponse(resp: Response): HTTPResponse {
        return new HTTPResponse(resp);
    }

}