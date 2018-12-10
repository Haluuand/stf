#!/bin/bash
cp ./lib/units/api/swagger/api_v1.yaml  ./lib/units/api/swagger/swagger.yaml 
swagger project edit './lib/units/api/' --host '0.0.0.0' --port '8081'
