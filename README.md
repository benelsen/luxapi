# luxapi

## Endpoints
- /vdl/parking.json
- /vdl/parking.geojson
- /vdl/bus/routes.json
- /vdl/bus/:route/stops.json
- /vdl/bus/:route/:stop/next.json

## Installation

```bash
$ git clone https://github.com/benelsen/luxapi.git
$ cd luxapi
$ npm install
$ memcached -p 11211 &
$ node server
```
The endpoints are available relative to [localhost:3000](http://localhost:3000/)

## License

[MIT](LICENSE)
